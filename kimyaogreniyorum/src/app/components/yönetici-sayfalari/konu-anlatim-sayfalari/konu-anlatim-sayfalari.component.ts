import { Component, OnInit, AfterViewInit, HostListener } from '@angular/core';
import * as fabric from 'fabric';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-konu-anlatim-sayfalari',
  templateUrl: './konu-anlatim-sayfalari.component.html',
  styleUrls: ['./konu-anlatim-sayfalari.component.scss'],
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, HttpClientModule]
})
export class KonuAnlatimSayfalariComponent implements OnInit, AfterViewInit {
  canvasInstances: fabric.Canvas[] = [];
  sayfalar: any[] = [{}]; // Başlangıçta bir sayfa olsun
  currentPage: number = 1;
  totalPages: number = 1;
  ogrenciGruplari: string[] = ['9A Sınıfı', '10B Sınıfı', '11C Sınıfı', '12D Sınıfı'];
  secilenGrup: string = '';
  kaydetmeIsleminde: boolean = false;
  kalemRengi: string = '#000000';
  kalemKalinligi: number = 4; // Varsayılan olarak normal kalınlık
  kalemKalinlikSecenekleri: number[] = [2, 4, 8, 12, 16]; // İnce, normal, kalın, çok kalın, ekstra kalın
  cizilebilir: boolean = true;
  silgiModu: boolean = false;
  oncekiKalemRengi: string = '#000000';
  oncekiKalemKalinligi: number = 2;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // Kalem modunu aktifleştir
    document.body.classList.add('kalem-aktif');
  }

  ngAfterViewInit(): void {
    // İlk canvas'ı oluştur
    setTimeout(() => {
      this.canvasOlustur(1);
    }, 500);
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    // Tüm canvas'ları yeniden boyutlandır
    this.canvasInstances.forEach((canvas, index) => {
      if (canvas) {
        this.canvasBoyutlandir(index + 1);
      }
    });
  }

  // Hızlı renk seçimi için metod
  hizliRenkSec(renk: string): void {
    this.kalemRengi = renk;
    this.silgiModu = false; // Renk seçildiğinde silgi modundan çık
    this.ayarlaKalemOzellikleri();

    // Kalem modunu etkinleştir
    document.body.classList.add('kalem-aktif');
    document.body.classList.remove('silgi-aktif');
  }

  canvasOlustur(sayfaNo: number): void {
    try {
      const canvasId = `canvas-${sayfaNo}`;
      const canvasEl = document.getElementById(canvasId) as HTMLCanvasElement;

      if (!canvasEl) {
        console.error(`Canvas element ${canvasId} bulunamadı`);
        return;
      }

      // Canvas boyutlarını ayarla
      const container = canvasEl.parentElement;
      if (container) {
        canvasEl.width = container.clientWidth;
        canvasEl.height = container.clientHeight;
      }

      // Yeni fabric canvas oluştur
      const canvas = new fabric.Canvas(canvasId, {
        isDrawingMode: true,
        width: canvasEl.width,
        height: canvasEl.height,
        selection: false,
        renderOnAddRemove: true,
        interactive: true,
        backgroundColor: '#ffffff'
      });

      // Canvas array'e ekle veya güncelle
      if (this.canvasInstances.length < sayfaNo) {
        this.canvasInstances.push(canvas);
      } else {
        this.canvasInstances[sayfaNo - 1] = canvas;
      }

      // Kalem özelliklerini ayarla
      this.ayarlaKalemOzellikleri(sayfaNo);

      console.log(`Canvas ${sayfaNo} oluşturuldu`, canvas);
    } catch (error) {
      console.error(`Canvas ${sayfaNo} oluşturma hatası:`, error);
    }
  }

  canvasBoyutlandir(sayfaNo: number): void {
    const canvas = this.canvasInstances[sayfaNo - 1];
    if (!canvas) return;

    try {
      const canvasEl = document.getElementById(`canvas-${sayfaNo}`) as HTMLCanvasElement;
      const container = canvasEl.parentElement;

      if (container) {
        // Canvas boyutlarını güncelle
        canvas.setWidth(container.clientWidth);
        canvas.setHeight(container.clientHeight);
        canvas.renderAll();
      }
    } catch (error) {
      console.error(`Canvas ${sayfaNo} boyutlandırma hatası:`, error);
    }
  }

  sayfaEkle(): void {
    this.sayfalar.push({});
    this.totalPages = this.sayfalar.length;

    // Yeni sayfaya geç
    this.currentPage = this.totalPages;
    this.sayfayaGit(this.currentPage);

    // Yeni sayfanın canvas'ını oluştur
    setTimeout(() => {
      this.canvasOlustur(this.currentPage);
    }, 100);
  }

  // Sayfa navigasyon fonksiyonları
  sayfaBas(): void {
    if (this.currentPage !== 1) {
      this.currentPage = 1;
      this.sayfayaGit(1);
    }
  }

  oncekiSayfa(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.sayfayaGit(this.currentPage);
    }
  }

  sonrakiSayfa(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.sayfayaGit(this.currentPage);
    }
  }

  sayfaSon(): void {
    if (this.currentPage !== this.totalPages) {
      this.currentPage = this.totalPages;
      this.sayfayaGit(this.totalPages);
    }
  }

  sayfayaGit(sayfa: number): void {
    // Aktif sayfa sınıfını değiştir
    const sayfalar = document.querySelectorAll('.beyaz-tahta');
    sayfalar.forEach((element, index) => {
      if (index + 1 === sayfa) {
        element.classList.add('aktif-sayfa');
      } else {
        element.classList.remove('aktif-sayfa');
      }
    });

    this.currentPage = sayfa;

    // Eğer bu sayfanın canvas'ı yoksa oluştur
    if (!this.canvasInstances[sayfa - 1]) {
      setTimeout(() => {
        this.canvasOlustur(sayfa);
      }, 100);
    } else {
      // Kalem özelliklerini güncelle
      this.ayarlaKalemOzellikleri(sayfa);
    }
  }

  temizleSayfa(): void {
    const canvas = this.canvasInstances[this.currentPage - 1];
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
    }
  }

  toggleCizim(): void {
    this.cizilebilir = !this.cizilebilir;

    const canvas = this.canvasInstances[this.currentPage - 1];
    if (canvas) {
      canvas.isDrawingMode = this.cizilebilir;
    }

    // İmleç stilini güncelle
    if (this.cizilebilir) {
      if (this.silgiModu) {
        document.body.classList.add('silgi-aktif');
        document.body.classList.remove('kalem-aktif');
        document.body.classList.remove('el-imleci-aktif');
      } else {
        document.body.classList.add('kalem-aktif');
        document.body.classList.remove('silgi-aktif');
        document.body.classList.remove('el-imleci-aktif');
      }
    } else {
      // Kalem ve silgi modlarını kapat, el imleci kullan
      document.body.classList.remove('kalem-aktif', 'silgi-aktif');
      document.body.classList.add('el-imleci-aktif');
    }

    console.log('Çizim modu değiştirildi:', this.cizilebilir ? 'Kalem/Silgi Aktif' : 'El İmleci Aktif');
  }

  ayarlaKalemOzellikleri(sayfaNo?: number): void {
    const pageNo = sayfaNo || this.currentPage;
    const canvas = this.canvasInstances[pageNo - 1];

    if (!canvas) {
      console.log(`Canvas ${pageNo} henüz hazır değil`);
      return;
    }

    // Canvas'ı çizim moduna al
    canvas.isDrawingMode = this.cizilebilir;

    // Brush'ı kontrol et
    if (!canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    }

    // Kalem ayarlarını güncelle
    canvas.freeDrawingBrush.color = this.kalemRengi;
    canvas.freeDrawingBrush.width = this.kalemKalinligi;

    // İnce çizgiler için ek ayarlar (fabric.js versiyonuna göre)
    try {
      if (canvas.freeDrawingBrush.hasOwnProperty('getInk')) {
        (canvas.freeDrawingBrush as any).getInk = false;
      }
    } catch (e) {
      console.log('getInk özelliği bu fabric.js versiyonunda desteklenmiyor');
    }
  }

  silgiModunuAc(): void {
    if (!this.silgiModu) {
      this.silgiModu = true;
      // Önceki kalem ayarlarını kaydet
      this.oncekiKalemRengi = this.kalemRengi;
      this.oncekiKalemKalinligi = this.kalemKalinligi;

      // Silgi modunu etkinleştir - beyaz renk ile silme efekti
      this.kalemRengi = '#ffffff';
      this.kalemKalinligi = Math.max(20, this.kalemKalinligi); // Silgi en az 20px olsun
      this.ayarlaKalemOzellikleri();

      // İmleç stilini güncelle
      document.body.classList.add('silgi-aktif');
      document.body.classList.remove('kalem-aktif');
      document.body.classList.remove('el-imleci-aktif');
    }
  }

  kalemModunuAc(): void {
    if (this.silgiModu) {
      this.silgiModu = false;
      // Önceki kalem ayarlarını geri yükle
      this.kalemRengi = this.oncekiKalemRengi;
      this.kalemKalinligi = this.oncekiKalemKalinligi;
      this.ayarlaKalemOzellikleri();

      // İmleç stilini güncelle
      document.body.classList.add('kalem-aktif');
      document.body.classList.remove('silgi-aktif');
    }
  }

  // PDF'i oluştur ve indir
  indirPDF(): void {
    this.kaydetmeIsleminde = true;

    try {
      // PDF oluştur
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const processNextPage = (page: number) => {
        if (page > this.totalPages) {
          // Tüm sayfalar tamamlandı, PDF'i indir
          const dosyaAdi = this.secilenGrup ? 
            `ders_notu_${this.secilenGrup.replace(' ', '_')}.pdf` : 
            'ders_notu.pdf';

          pdf.save(dosyaAdi);
          this.kaydetmeIsleminde = false;

          // Eğer grup seçilmişse veritabanına da kaydet
          if (this.secilenGrup) {
            this.veritabaninaKaydet(pdf);
          }

          return;
        }

        // Geçerli sayfayı görünür yap ve canvas'ı al
        this.sayfayaGit(page);

        setTimeout(() => {
          const canvas = this.canvasInstances[page - 1];
          if (canvas) {
            // Canvas'ı PNG olarak dışa aktar
            const dataURL = canvas.toDataURL({
              format: 'png',
              quality: 1,
              multiplier: 2
            });

            // İlk sayfa değilse yeni sayfa ekle
            if (page > 1) {
              pdf.addPage();
            }

            // PNG'yi PDF'e ekle
            const imgWidth = 210; // A4 genişliği (mm)
            const imgHeight = 297; // A4 yüksekliği (mm)
            pdf.addImage(dataURL, 'PNG', 0, 0, imgWidth, imgHeight);

            // Sonraki sayfaya geç
            processNextPage(page + 1);
          } else {
            console.error(`Canvas ${page} bulunamadı`);
            processNextPage(page + 1);
          }
        }, 200);
      };

      // İlk sayfadan başla
      processNextPage(1);

    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken bir hata oluştu!');
      this.kaydetmeIsleminde = false;
    }
  }

  // Veritabanına kaydetme işlemi
  veritabaninaKaydet(pdfDoc?: jsPDF): void {
    if (!this.secilenGrup) {
      alert('Lütfen bir öğrenci grubu seçin!');
      return;
    }

    this.kaydetmeIsleminde = true;

    try {
      // Eğer PDF dokümanı parametre olarak gelmemişse, indirPDF metodunu çağırmadan PDF oluştur
      if (!pdfDoc) {
        // PDF oluştur
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        // PDF'i Blob olarak al
        const pdfBlob = pdf.output('blob');

        // Form verisi oluştur
        const formData = new FormData();
        formData.append('ogrenci_grubu', this.secilenGrup);
        formData.append('pdf_dosyasi', pdfBlob, `ders_notu_${this.secilenGrup.replace(' ', '_')}.pdf`);
        formData.append('sayfa_sayisi', this.totalPages.toString());

        // Her sayfanın görüntüsünü ekle
        for (let i = 0; i < this.totalPages; i++) {
          const canvas = this.canvasInstances[i];
          if (canvas) {
            const dataURL = canvas.toDataURL({
              format: 'png',
              quality: 0.8,
              multiplier: 1.5
            });

            // Base64 String'i Blob'a dönüştür
            const blobData = this.dataURLtoBlob(dataURL);
            formData.append(`sayfa_${i + 1}`, blobData, `sayfa_${i + 1}.png`);
          }
        }

        // HTTP POST isteği ile backend'e gönder
        // this.http.post('server/api/konu_anlatim_kaydet.php', formData).subscribe({
        //   next: (response: any) => {
        //     alert('Konu anlatımı başarıyla veritabanına kaydedildi!');
        //     this.kaydetmeIsleminde = false;
        //   },
        //   error: (error) => {
        //     console.error('Kaydetme hatası:', error);
        //     alert('Kaydetme işlemi sırasında bir hata oluştu!');
        //     this.kaydetmeIsleminde = false;
        //   }
        // });

        // Simülasyon
        setTimeout(() => {
          alert(`Konu anlatımı "${this.secilenGrup}" için veritabanına kaydedildi.`);
          this.kaydetmeIsleminde = false;
        }, 1500);
      } else {
        // Zaten oluşturulmuş PDF ile kaydet
        const pdfBlob = pdfDoc.output('blob');

        // Form verisi oluştur
        const formData = new FormData();
        formData.append('ogrenci_grubu', this.secilenGrup);
        formData.append('pdf_dosyasi', pdfBlob, `ders_notu_${this.secilenGrup.replace(' ', '_')}.pdf`);

        // Simülasyon
        setTimeout(() => {
          alert(`Konu anlatımı "${this.secilenGrup}" için veritabanına kaydedildi.`);
          this.kaydetmeIsleminde = false;
        }, 1500);
      }
    } catch (error) {
      console.error('Veritabanına kaydetme hatası:', error);
      alert('Veritabanına kaydetme işlemi sırasında bir hata oluştu!');
      this.kaydetmeIsleminde = false;
    }
  }

  // DataURL'i Blob'a dönüştürme yardımcı fonksiyonu
  private dataURLtoBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
  }

  // Sayfa terk edildiğinde uyarı mesajı göster
  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: any) {
    // Herhangi bir canvas'ta çizim var mı kontrol et
    let hasDrawings = false;

    for (const canvas of this.canvasInstances) {
      if (canvas && canvas.getObjects().length > 0) {
        hasDrawings = true;
        break;
      }
    }

    if (hasDrawings) {
      event.returnValue = 'Sayfadan ayrılmak istediğinize emin misiniz? Yapılan değişiklikler kaybolabilir.';
      return event.returnValue;
    }
    return true;
  }
}