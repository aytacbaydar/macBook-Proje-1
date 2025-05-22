
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
header("Content-Type: application/json; charset=UTF-8");

// OPTIONS isteğini yönet (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require '../config.php';

// Yardımcı fonksiyonlar
function errorResponse($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit();
}

function successResponse($data, $message = 'İşlem başarılı') {
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => $message, 'data' => $data]);
    exit();
}

// POST isteği kontrol et
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Sadece POST istekleri kabul edilir', 405);
}

// Kullanıcı doğrulama (config.php içinde define edilmiş olmalı)
try {
    $user = authorize();
} catch (Exception $e) {
    errorResponse('Oturum doğrulama hatası: ' . $e->getMessage(), 401);
}

// Gerekli verileri kontrol et
if (!isset($_POST['pdf_adi']) || !isset($_POST['ogrenci_grubu']) || !isset($_FILES['pdf_dosyasi'])) {
    errorResponse('Gerekli alanlar eksik: pdf_adi, ogrenci_grubu ve pdf_dosyasi gereklidir');
}

// Üst klasörleri oluştur
$pdfDirectory = '../../dosyalar/pdf/';
$cizimDirectory = '../../dosyalar/cizimler/';

// Klasörleri oluştur
foreach ([$pdfDirectory, $cizimDirectory] as $directory) {
    if (!file_exists($directory)) {
        if (!mkdir($directory, 0777, true)) {
            errorResponse('Klasör oluşturulamadı: ' . $directory, 500);
        }
    }
}

try {
    // Veritabanı bağlantısı
    $conn = getConnection();
    
    // Verileri al
    $pdfAdi = $_POST['pdf_adi'];
    $sayfaNo = isset($_POST['sayfa_no']) ? (int)$_POST['sayfa_no'] : 1;
    $ogrenciGrubu = $_POST['ogrenci_grubu'];
    $ogretmenId = $user['id'];
    
    // Dosya adlarını oluştur
    $tarih = date('Ymd_His');
    $benzersizId = uniqid();
    
    // PDF dosyasını kaydet
    $pdfDosyaAdi = 'konu_' . $benzersizId . '_' . $tarih . '.pdf';
    $pdfYolu = $pdfDirectory . $pdfDosyaAdi;
    
    if (!move_uploaded_file($_FILES['pdf_dosyasi']['tmp_name'], $pdfYolu)) {
        errorResponse('PDF dosyası kaydedilemedi', 500);
    }
    
    // Çizim dosyasını kaydet (varsa)
    $cizimDosyaAdi = null;
    $cizimYolu = null;
    
    if (isset($_FILES['cizim_verisi']) && $_FILES['cizim_verisi']['error'] == 0) {
        $cizimDosyaAdi = 'cizim_' . $benzersizId . '_' . $tarih . '.png';
        $cizimYolu = $cizimDirectory . $cizimDosyaAdi;
        
        if (!move_uploaded_file($_FILES['cizim_verisi']['tmp_name'], $cizimYolu)) {
            errorResponse('Çizim dosyası kaydedilemedi', 500);
        }
    }
    
    // Veritabanı kaydı
    $stmt = $conn->prepare("
        INSERT INTO konu_anlatim_kayitlari (
            pdf_adi, pdf_dosya_yolu, sayfa_no, 
            cizim_dosya_yolu, ogrenci_grubu, ogretmen_id, 
            olusturma_zamani
        ) VALUES (
            :pdf_adi, :pdf_dosya_yolu, :sayfa_no, 
            :cizim_dosya_yolu, :ogrenci_grubu, :ogretmen_id, 
            NOW()
        )
    ");
    
    $stmt->bindParam(':pdf_adi', $pdfAdi);
    $stmt->bindParam(':pdf_dosya_yolu', $pdfDosyaAdi);
    $stmt->bindParam(':sayfa_no', $sayfaNo);
    $stmt->bindParam(':cizim_dosya_yolu', $cizimDosyaAdi);
    $stmt->bindParam(':ogrenci_grubu', $ogrenciGrubu);
    $stmt->bindParam(':ogretmen_id', $ogretmenId);
    
    if (!$stmt->execute()) {
        $error = $stmt->errorInfo();
        throw new PDOException("SQL Error: " . $error[2]);
    }
    
    $kayitId = $conn->lastInsertId();
    
    // Başarılı yanıt
    successResponse([
        'kayit_id' => $kayitId,
        'pdf_yolu' => 'dosyalar/pdf/' . $pdfDosyaAdi,
        'cizim_yolu' => $cizimDosyaAdi ? 'dosyalar/cizimler/' . $cizimDosyaAdi : null
    ], 'Konu anlatım kaydı başarıyla oluşturuldu');
    
} catch (PDOException $e) {
    errorResponse('Veritabanı hatası: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    errorResponse('Beklenmeyen bir hata oluştu: ' . $e->getMessage(), 500);
}
?>
