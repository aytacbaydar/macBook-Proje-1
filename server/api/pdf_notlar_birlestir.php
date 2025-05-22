
<?php
// Hataları dosyaya logla
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', '../../logs/pdf_errors.log');

// CORS başlıkları
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// OPTIONS isteğini yönet (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Hata yakalama
function errorResponse($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit();
}

try {
    // PDF ve notları kontrol et
    if (!isset($_FILES['pdf_dosyasi']) || !isset($_FILES['notlar'])) {
        errorResponse('Gerekli dosyalar eksik: pdf_dosyasi ve notlar gereklidir');
    }

    // Üst klasörleri oluştur
    $tempDirectory = '../../dosyalar/temp/';
    
    if (!file_exists($tempDirectory)) {
        mkdir($tempDirectory, 0777, true);
    }

    // Geçici dosya adları oluştur
    $pdfPath = $tempDirectory . uniqid() . '.pdf';
    $notPath = $tempDirectory . uniqid() . '.png';
    $outputPath = $tempDirectory . uniqid() . '_notlu.pdf';

    // Dosyaları geçici klasöre taşı
    move_uploaded_file($_FILES['pdf_dosyasi']['tmp_name'], $pdfPath);
    move_uploaded_file($_FILES['notlar']['tmp_name'], $notPath);

    // PDF üzerine notları yerleştir
    // Bu kısım için FPDF, TCPDF veya PHP GD kullanılabilir
    // Basit bir yaklaşım için ImageMagick kullanacağız
    
    // Sayfa numarasını al
    $sayfaNo = isset($_POST['sayfa_no']) ? intval($_POST['sayfa_no']) : 1;
    
    // PDF'den ilgili sayfayı PNG olarak çıkar
    exec("convert -density 150 -quality 90 {$pdfPath}[" . ($sayfaNo - 1) . "] {$tempDirectory}sayfa.png", $output, $returnVar);
    
    if ($returnVar !== 0) {
        // ImageMagick yoksa alternatif olarak GhostScript kullanmayı deneyin
        exec("gs -sDEVICE=pngalpha -dFirstPage={$sayfaNo} -dLastPage={$sayfaNo} -dBATCH -dNOPAUSE -r150 -sOutputFile={$tempDirectory}sayfa.png {$pdfPath}", $output, $returnVar);
    }
    
    if ($returnVar !== 0) {
        // PDF içeriğini doğrudan döndür
        header('Content-Type: application/pdf');
        readfile($pdfPath);
        
        // Geçici dosyaları temizle
        unlink($pdfPath);
        unlink($notPath);
        exit();
    }
    
    // PNG sayfasını ve notları birleştir
    exec("composite -compose over {$notPath} {$tempDirectory}sayfa.png {$tempDirectory}birlesik.png", $output, $returnVar);
    
    // Birleştirilmiş sayfayı PDF'e dönüştür
    exec("convert {$tempDirectory}birlesik.png {$tempDirectory}birlesik.pdf", $output, $returnVar);
    
    // Orijinal PDF'nin diğer sayfalarını koru ve birleştirilmiş sayfayı ekle
    if ($sayfaNo > 1) {
        // Önceki sayfaları al
        exec("gs -sDEVICE=pdfwrite -dBATCH -dNOPAUSE -dFirstPage=1 -dLastPage=" . ($sayfaNo - 1) . " -sOutputFile={$tempDirectory}onceki.pdf {$pdfPath}", $output, $returnVar);
        
        // Sonraki sayfaları al (varsa)
        if ($sayfaNo < intval(exec("pdfinfo {$pdfPath} | grep Pages | awk '{print $2}'"))) {
            exec("gs -sDEVICE=pdfwrite -dBATCH -dNOPAUSE -dFirstPage=" . ($sayfaNo + 1) . " -sOutputFile={$tempDirectory}sonraki.pdf {$pdfPath}", $output, $returnVar);
            
            // Tüm parçaları birleştir
            exec("gs -sDEVICE=pdfwrite -dBATCH -dNOPAUSE -sOutputFile={$outputPath} {$tempDirectory}onceki.pdf {$tempDirectory}birlesik.pdf {$tempDirectory}sonraki.pdf", $output, $returnVar);
        } else {
            // Sadece önceki sayfalar ve birleştirilmiş sayfayı birleştir
            exec("gs -sDEVICE=pdfwrite -dBATCH -dNOPAUSE -sOutputFile={$outputPath} {$tempDirectory}onceki.pdf {$tempDirectory}birlesik.pdf", $output, $returnVar);
        }
    } else if ($sayfaNo == 1) {
        // İlk sayfa değiştiriliyorsa ve başka sayfalar varsa
        if (intval(exec("pdfinfo {$pdfPath} | grep Pages | awk '{print $2}'")) > 1) {
            exec("gs -sDEVICE=pdfwrite -dBATCH -dNOPAUSE -dFirstPage=2 -sOutputFile={$tempDirectory}sonraki.pdf {$pdfPath}", $output, $returnVar);
            
            // Birleştirilmiş sayfa ve sonraki sayfaları birleştir
            exec("gs -sDEVICE=pdfwrite -dBATCH -dNOPAUSE -sOutputFile={$outputPath} {$tempDirectory}birlesik.pdf {$tempDirectory}sonraki.pdf", $output, $returnVar);
        } else {
            // Tek sayfalık PDF, sadece birleştirilmiş sayfayı kullan
            copy("{$tempDirectory}birlesik.pdf", $outputPath);
        }
    }
    
    // Birleştirilmiş PDF'i döndür
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="notlu_pdf.pdf"');
    readfile($outputPath);
    
    // Geçici dosyaları temizle
    @unlink($pdfPath);
    @unlink($notPath);
    @unlink("{$tempDirectory}sayfa.png");
    @unlink("{$tempDirectory}birlesik.png");
    @unlink("{$tempDirectory}birlesik.pdf");
    @unlink("{$tempDirectory}onceki.pdf");
    @unlink("{$tempDirectory}sonraki.pdf");
    @unlink($outputPath);
    
} catch (Exception $e) {
    error_log("PDF Birleştirme Hatası: " . $e->getMessage());
    
    // Hata durumunda basit PDF döndür
    if (isset($pdfPath) && file_exists($pdfPath)) {
        header('Content-Type: application/pdf');
        readfile($pdfPath);
        
        // Geçici dosyaları temizle
        @unlink($pdfPath);
        @unlink($notPath);
    } else {
        errorResponse('PDF işleme hatası: ' . $e->getMessage(), 500);
    }
}
?>
