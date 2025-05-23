<?php
// CORS ve Content-Type başlıkları (EN BAŞTA olmalı - herhangi bir çıktıdan önce)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Hataları göster ve logla (geliştirme aşamasında)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', '../../logs/pdf_errors.log');

// Debugger
error_log("konu_anlatim_kaydet.php çalıştırıldı: " . date('Y-m-d H:i:s'));
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// OPTIONS isteğini yönet (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require '../config.php';

// Yardımcı fonksiyonlar
//errorResponse fonksiyonu config.php'den geliyor

function successResponse($data, $message = 'İşlem başarılı') {
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => $message, 'data' => $data]);
    exit();
}

// POST isteği kontrol et
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Sadece POST istekleri kabul edilir', 405);
}

// Yetkilendirme kontrolü (dışa açık olduğu için şimdilik kapatıldı)
// try {
//     $user = authorize();
// } catch (Exception $e) {
//     errorResponse('Oturum doğrulama hatası: ' . $e->getMessage(), 401);
// }

// Gerekli verileri kontrol et
if (!isset($_POST['pdf_adi']) || !isset($_POST['ogrenci_grubu']) || !isset($_FILES['pdf_dosyasi'])) {
    errorResponse('Gerekli alanlar eksik: pdf_adi, ogrenci_grubu ve pdf_dosyasi gereklidir');
}

// Üst klasörleri oluştur
$pdfDirectory = '../../dosyalar/pdf/';
$cizimDirectory = '../../dosyalar/cizimler/';

// Klasör yollarını doğrula ve mutlak yolları logla
$pdfDirectoryAbs = realpath(dirname(__FILE__) . '/../../') . '/dosyalar/pdf/';
$cizimDirectoryAbs = realpath(dirname(__FILE__) . '/../../') . '/dosyalar/cizimler/';

error_log("PDF klasörü: $pdfDirectoryAbs");
error_log("Çizim klasörü: $cizimDirectoryAbs");

// Klasörleri oluştur
foreach ([$pdfDirectory, $cizimDirectory] as $directory) {
    if (!file_exists($directory)) {
        error_log("Klasör oluşturuluyor: $directory");
        if (!mkdir($directory, 0777, true)) {
            $error = error_get_last();
            errorResponse('Klasör oluşturulamadı: ' . $directory . ' - Hata: ' . ($error ? $error['message'] : 'Bilinmeyen hata'), 500);
        }
        error_log("Klasör başarıyla oluşturuldu: $directory");
    } else {
        error_log("Klasör zaten var: $directory");
    }
}

// Loglama klasörünü oluştur
$logDir = '../../logs';
if (!file_exists($logDir)) {
    if (!mkdir($logDir, 0777, true)) {
        // Hata durumunda çıkış yapma, sadece logla
        error_log("Log klasörü oluşturulamadı: $logDir");
    } else {
        error_log("Log klasörü oluşturuldu: $logDir");
    }
}

try {
    // Veritabanı bağlantısını test et
    error_log("Veritabanı bağlantısı kuruluyor...");

    try {
        $conn = getConnection();
        error_log("Veritabanı bağlantısı başarılı");
    } catch (Exception $e) {
        error_log("Veritabanı bağlantı hatası: " . $e->getMessage());
        errorResponse("Veritabanı bağlantısı kurulamadı: " . $e->getMessage(), 500);
    }

    // Verileri al
    $pdfAdi = $_POST['pdf_adi'];
    $sayfaSayisi = isset($_POST['sayfa_sayisi']) ? (int)$_POST['sayfa_sayisi'] : 1;
    $ogrenciGrubu = $_POST['ogrenci_grubu'];
    $ogretmenId = 1; // Test için sabit bir değer kullanıyoruz

    // Dosya adlarını oluştur
    $tarih = date('Ymd_His');
    $benzersizId = uniqid();

    // PDF dosyasını kaydet
    $pdfDosyaAdi = 'konu_' . $benzersizId . '_' . $tarih . '.pdf';
    $pdfYolu = $pdfDirectory . $pdfDosyaAdi;

    // Dosya sistemi bilgilerini logla
    $diskFree = disk_free_space("/");
    $diskTotal = disk_total_space("/");
    $diskUsed = $diskTotal - $diskFree;
    $diskPercentage = round($diskUsed / $diskTotal * 100, 2);

    error_log("Disk kullanımı: $diskPercentage% - Kullanılan: " . round($diskUsed / 1024 / 1024) . "MB, Boş: " . round($diskFree / 1024 / 1024) . "MB");
    error_log("Kaydedilecek dosya yolu: $pdfYolu");

    // Klasör izinlerini kontrol et ve ayarla
    if (!is_writable(dirname($pdfYolu))) {
        chmod(dirname($pdfYolu), 0777);
        error_log("Klasör izinleri ayarlandı: " . dirname($pdfYolu));
    }

    // Upload detaylarını logla
    error_log("PDF yükleme bilgileri: " . print_r($_FILES['pdf_dosyasi'], true));

    // Geçici dosyanın varlığını kontrol et
    if (!file_exists($_FILES['pdf_dosyasi']['tmp_name'])) {
        error_log("PDF geçici dosyası bulunamadı: " . $_FILES['pdf_dosyasi']['tmp_name']);
        errorResponse('PDF geçici dosyası bulunamadı. Yükleme başarısız.', 500);
    }

    // Dosya boyutu kontrolü
    if ($_FILES['pdf_dosyasi']['size'] <= 0) {
        error_log("PDF dosya boyutu sıfır veya geçersiz: " . $_FILES['pdf_dosyasi']['size']);
        errorResponse('PDF dosya boyutu geçersiz.', 500);
    }

    // Dosyayı taşı
    if (!move_uploaded_file($_FILES['pdf_dosyasi']['tmp_name'], $pdfYolu)) {
        $error = error_get_last();
        $phpFileUploadErrors = array(
            0 => 'Hata yok, dosya başarıyla yüklendi',
            1 => 'Yüklenen dosya php.ini\'deki upload_max_filesize değerini aşıyor',
            2 => 'Yüklenen dosya HTML formundaki MAX_FILE_SIZE değerini aşıyor',
            3 => 'Yüklenen dosya kısmen yüklendi',
            4 => 'Hiçbir dosya yüklenmedi',
            6 => 'Geçici klasör eksik',
            7 => 'Disk üzerine dosya yazılamadı',
            8 => 'Bir PHP uzantısı dosya yüklemesini durdurdu',
        );

        $errorCode = $_FILES['pdf_dosyasi']['error'];
        $errorMessage = isset($phpFileUploadErrors[$errorCode]) ? $phpFileUploadErrors[$errorCode] : 'Bilinmeyen hata';

        error_log("PDF dosyası taşırken hata. Kod: $errorCode, Mesaj: $errorMessage");
        error_log("Hata detayı: " . ($error ? print_r($error, true) : 'Detay yok'));

        // Manuel kopyalama dene
        if (!copy($_FILES['pdf_dosyasi']['tmp_name'], $pdfYolu)) {
            error_log("Manuel kopyalama da başarısız oldu");
            errorResponse("PDF dosyası kaydedilemedi: $errorMessage", 500);
        } else {
            error_log("Manuel kopyalama başarılı oldu");
        }
    }
    error_log("PDF dosyası başarıyla kaydedildi: $pdfYolu");

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

    // Veritabanı kaydı için tablo kontrol et ve oluştur
    $tableSql = "
    CREATE TABLE IF NOT EXISTS `konu_anlatim_kayitlari` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `pdf_adi` varchar(255) NOT NULL,
      `pdf_dosya_yolu` varchar(255) NOT NULL,
      `sayfa_sayisi` int(11) NOT NULL DEFAULT 1,
      `cizim_dosya_yolu` varchar(255) DEFAULT NULL,
      `ogrenci_grubu` varchar(100) NOT NULL,
      `ogretmen_id` int(11) NOT NULL,
      `olusturma_zamani` datetime NOT NULL,
      `guncelleme_zamani` datetime DEFAULT NULL,
      PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $conn->exec($tableSql);

    // Tablo var mı kontrol et
    $tableCheck = $conn->query("SHOW TABLES LIKE 'konu_anlatim_kayitlari'");
    if ($tableCheck->rowCount() == 0) {
        // Tablo yoksa oluştur
        $conn->exec($tableSql);
        error_log("Tablo oluşturuldu: konu_anlatim_kayitlari");
    }

    // Veritabanı kaydı
    try {
        $stmt = $conn->prepare("
            INSERT INTO konu_anlatim_kayitlari (
                pdf_adi, pdf_dosya_yolu, sayfa_sayisi, 
                cizim_dosya_yolu, ogrenci_grubu, ogretmen_id, 
                olusturma_zamani
            ) VALUES (
                :pdf_adi, :pdf_dosya_yolu, :sayfa_sayisi, 
                :cizim_dosya_yolu, :ogrenci_grubu, :ogretmen_id, 
                NOW()
            )
        ");

        $stmt->bindParam(':pdf_adi', $pdfAdi);
        $stmt->bindParam(':pdf_dosya_yolu', $pdfDosyaAdi);
        $stmt->bindParam(':sayfa_sayisi', $sayfaSayisi);
        $stmt->bindParam(':cizim_dosya_yolu', $cizimDosyaAdi);
        $stmt->bindParam(':ogrenci_grubu', $ogrenciGrubu);
        $stmt->bindParam(':ogretmen_id', $ogretmenId);

        if (!$stmt->execute()) {
            $error = $stmt->errorInfo();
            throw new PDOException("SQL Error: " . $error[2]);
        }
    } catch (PDOException $e) {
        error_log("SQL Hatası: " . $e->getMessage());
        throw $e;
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