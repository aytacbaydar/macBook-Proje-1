import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import * as fabric from 'fabric';
import { FormsModule } from '@angular/forms';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-konu-anlatim-sayfalari',
  templateUrl: './konu-anlatim-sayfalari.component.html',
  styleUrls: ['./konu-anlatim-sayfalari.component.scss'],
  standalone: true,
  imports: [FormsModule, PdfViewerModule, NgIf, NgFor]
})
export class KonuAnlatimSayfalariComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvasElement!: ElementRef<HTMLCanvasElement>;
  pdfSrc: string = '';
  secilenPDF: string = '';
  pdfYuklendi: boolean = false;
  canvas!: fabric.Canvas;
  cizilebilir: boolean = true;
  silgiModu: boolean = false;
  oncekiKalemRengi: string = '#000000';
  oncekiKalemKalinligi: number = 2;
  currentPage: number = 1;
  totalPages: number = 0;
  ogrenciGruplari: string[] = ['9A Sınıfı', '10B Sınıfı', '11C Sınıfı', '12D Sınıfı'];
  secilenGrup: string = '';
  kaydetmeIsleminde: boolean = false;
  kalemRengi: string = '#000000';
  kalemKalinligi: number = 4; // Varsayılan olarak normal kalınlık
  kalemKalinlikSecenekleri: number[] = [2, 4, 8, 12, 16]; // İnce, normal, kalın, çok kalın, ekstra kalın
  dosyaBoyutuUyarisi: boolean = false;
  maxDosyaBoyutu: number = 16 * 1024 * 1024; // 16 MB
  tamEkranModu: boolean = false;
  zoom: number = 1.0; // PDF yakınlaştırma oranı

  constructor() { }

  ngOnInit(): void {
    // PDF container sınıfını ekleyerek kalem modunu aktifleştir
    document.body.classList.add('kalem-aktif');
  }

  ngAfterViewInit(): void {
    // Kalem kurulumu için düzenle (PDF yükleme bekleniyor)
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    if (this.canvas && this.pdfYuklendi) {
      this.canvasBoyutlandir();
    }
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

  pdfSecildi(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.secilenPDF = file.name;

      // Dosya boyutu kontrolü
      if (file.size > this.maxDosyaBoyutu) {
        this.dosyaBoyutuUyarisi = true;
        alert(`Dikkat: Seçtiğiniz PDF dosyası ${Math.round(file.size / (1024 * 1024))} MB boyutundadır. 
               Büyük dosyalar yavaş yüklenebilir veya performans sorunlarına neden olabilir.
               Devam etmek için 'Optimize Et ve Yükle' düğmesine tıklayın.`);
        return;
      }

      this.pdfDosyasiniYukle(file);
    }
  }

  pdfDosyasiniYukle(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      console.log('PDF dosyası yükleniyor...');

      try {
        const pdfData = e.target.result;

        // PDF veri URL'i ayarla
        this.pdfSrc = pdfData;

        // PDF yükleme durumunu güncelle
        this.pdfYuklendi = true;
        this.dosyaBoyutuUyarisi = false;

        console.log('PDF görüntüleyici hazırlanıyor...');
      } catch (error) {
        console.error('PDF işleme hatası:', error);
        alert('PDF dosyası işlenirken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    };

    reader.onerror = (error) => {
      console.error('PDF yükleme hatası:', error);
      alert('PDF dosyası yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    };

    reader.readAsDataURL(file);
  }

  optimizeEtVeYukle(): void {
    const fileInput = document.getElementById('pdf-yukle') as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      this.pdfDosyasiniYukle(fileInput.files[0]);
    }
  }

  pdfYuklendiHandler(event: any): void {
    this.totalPages = event.numPages;
    console.log('PDF sayfa sayısı:', this.totalPages);

    // Tüm sayfaları göstermek için currentPage değerini 1 olarak ayarla
    // PDF viewer'ın [show-all]="true" özelliği zaten tüm sayfaları gösterecektir
    this.currentPage = 1;

    // Canvas oluştur (PDF tamamen yüklendikten sonra)
    setTimeout(() => {
      this.canvasOlustur();

      // Canvas'ı yeniden olusturmak için ekran yenilenmesine izin ver
      setTimeout(() => {
        // PDF container'ın tamamını görünür hale getir
        const pdfContainer = document.querySelector('.pdf-container') as HTMLElement;
        if (pdfContainer) {
          pdfContainer.style.height = '1400px';
          pdfContainer.style.width = '100%';
          pdfContainer.style.overflow = 'auto';
          pdfContainer.style.paddingBottom = '100px';
        }

        // Canvas yapılandırmasını güçlendir
        const canvasContainer = document.querySelector('.canvas-container') as HTMLElement;
        if (canvasContainer) {
          canvasContainer.style.pointerEvents = 'auto';
          canvasContainer.style.zIndex = '100';

          // Canvas elementlerini yapılandır
          const lowerCanvas = document.querySelector('.lower-canvas') as HTMLCanvasElement;
          const upperCanvas = document.querySelector('.upper-canvas') as HTMLCanvasElement;

          if (lowerCanvas) {
            lowerCanvas.style.pointerEvents = 'auto';
          }

          if (upperCanvas) {
            upperCanvas.style.pointerEvents = 'auto';
            upperCanvas.style.zIndex = '100';
            upperCanvas.style.cursor = 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="%23000000" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>\') 0 24, auto';
          }
        }

        // Kalem özelliklerini ayarla
        this.ayarlaKalemOzellikleri();

        // Kalem modunu etkinleştir
        this.cizilebilir = true;
        if (this.canvas) {
          this.canvas.isDrawingMode = true;
        }
      }, 500);
    }, 1000);
  }

  canvasOlustur(): void {
    if (!this.pdfYuklendi) return;

    try {
      console.log('Canvas oluşturma başlıyor...');

      // PDF konteyner boyutlarını al
      const pdfContainer = document.querySelector('.pdf-container') as HTMLElement;
      if (!pdfContainer) {
        console.error('PDF container bulunamadı');
        return;
      }

      // Önce PDF viewer elementini bul ve konumunu kontrol et
      const pdfViewer = document.querySelector('pdf-viewer') as HTMLElement;
      if (!pdfViewer) {
        console.error('PDF viewer bulunamadı');
        return;
      }

      // İçerik boyutlarını al (scrollWidth/Height içeriğin tam boyutunu verir)
      const totalWidth = Math.max(pdfContainer.scrollWidth, pdfContainer.clientWidth);
      const totalHeight = Math.max(pdfContainer.scrollHeight, pdfContainer.clientHeight);

      // PDF görüntüleme boyutlarını düzenle
      pdfViewer.style.width = '100%';
      pdfViewer.style.height = 'auto';
      pdfViewer.style.minHeight = '100%';

      // Tam ekran modundaysa biraz bekle boyutlar güncellensin
      setTimeout(() => {
        // Canvas elementi boyutlandırma - tüm PDF sayfalarını kapsayacak şekilde
        const canvasEl = this.canvasElement.nativeElement;
        // Tüm sayfaları görebilmek için yeterli yükseklik belirle
        canvasEl.width = totalWidth;
        canvasEl.height = Math.max(totalHeight, this.totalPages * 2000); // Her sayfa için yeterli alan arttırıldı

        console.log('Canvas boyutları:', totalWidth, 'x', totalHeight);

        // Eğer önceki canvas varsa temizle
        if (this.canvas) {
          this.canvas.dispose();
        }

        // Yeni fabric canvas oluştur
        this.canvas = new fabric.Canvas(canvasEl, {
          isDrawingMode: true,
          width: totalWidth,
          height: totalHeight,
          selection: false,
          renderOnAddRemove: true,
          interactive: true
        });

        // Kalem özelliklerini ayarla
        this.ayarlaKalemOzellikleri();

        // Canvas z-index ve pointer events ayarı
        const canvasContainer = document.querySelector('.canvas-container') as HTMLElement;
        if (canvasContainer) {
          canvasContainer.style.position = 'absolute';
          canvasContainer.style.top = '0';
          canvasContainer.style.left = '0';
          canvasContainer.style.width = '100%';
          canvasContainer.style.height = '100%';
          canvasContainer.style.zIndex = '10';
          canvasContainer.style.pointerEvents = 'auto';

          // Canvas'ı PDF içeriğine tam olarak yerleştir
          canvasContainer.style.overflow = 'visible';

          // Canvas'ı daha dominant hale getir
          const lowerCanvas = document.querySelector('.canvas-container .lower-canvas') as HTMLCanvasElement;
          const upperCanvas = document.querySelector('.canvas-container .upper-canvas') as HTMLCanvasElement;

          if (lowerCanvas) {
            lowerCanvas.style.pointerEvents = 'auto';
            lowerCanvas.style.position = 'absolute';
            lowerCanvas.style.top = '0';
            lowerCanvas.style.left = '0';
          }

          if (upperCanvas) {
            upperCanvas.style.pointerEvents = 'auto';
            upperCanvas.style.zIndex = '100';
            upperCanvas.style.position = 'absolute';
            upperCanvas.style.top = '0';
            upperCanvas.style.left = '0';
            upperCanvas.style.cursor = 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="%23000000" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>\') 0 24, auto';
          }
        }

        console.log('Canvas oluşturuldu ve yerleştirildi');

        // Kalem modunu aktifleştir
        this.cizilebilir = true;
        this.canvas.isDrawingMode = true;
        document.body.classList.add('kalem-aktif');
        document.body.classList.remove('silgi-aktif');

        // Canvas scroll işlemleri PDF container ile senkronize olsun
        pdfContainer.addEventListener('scroll', () => {
          if (canvasContainer) {
            canvasContainer.style.top = `-${pdfContainer.scrollTop}px`;
            canvasContainer.style.left = `-${pdfContainer.scrollLeft}px`;
          }
        });
      }, 500);

    } catch (error) {
      console.error('Canvas oluşturma hatası:', error);
    }
  }

  canvasBoyutlandir(): void {
    if (!this.canvas || !this.pdfYuklendi) return;

    try {
      // PDF konteyner boyutlarını al
      const pdfContainer = document.querySelector('.pdf-container') as HTMLElement;
      if (!pdfContainer) return;

      const width = pdfContainer.clientWidth;
      const height = pdfContainer.clientHeight;

      // Canvas boyutlarını güncelle
      this.canvas.setWidth(width);
      this.canvas.setHeight(height);
      this.canvas.renderAll();

      console.log('Canvas boyutları güncellendi:', width, 'x', height);
    } catch (error) {
      console.error('Canvas boyutlandırma hatası:', error);
    }
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
    // Önce currentPage değerini güncelle
    this.currentPage = sayfa;

    try {
      // Sayfayı bul ve kaydır
      setTimeout(() => {
        // Sayfa elementini seç
        const sayfaElement = document.querySelector(`.page[data-page-number="${sayfa}"]`) as HTMLElement;

        if (sayfaElement) {
          // Sayfaya kaydır
          const pdfContainer = document.querySelector('.pdf-container') as HTMLElement;
          if (pdfContainer) {
            pdfContainer.scrollTop = sayfaElement.offsetTop - 20;
          }

          // Önceki sayfaları kaydırmak için alternatif yaklaşım
          sayfaElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

          console.log('Sayfa değiştirildi:', sayfa);
        } else {
          console.error('Sayfa elementi bulunamadı:', sayfa);
        }

        // Canvas'ı temizle
        this.temizleCanvas();
      }, 200);
    } catch (error) {
      console.error('Sayfa değiştirme hatası:', error);
    }
  }

  temizleCanvas(): void {
    if (this.canvas) {
      this.canvas.clear();
    }
  }

  toggleCizim(): void {
    this.cizilebilir = !this.cizilebilir;

    if (this.canvas) {
      this.canvas.isDrawingMode = this.cizilebilir;
    }

    // İmleç stilini güncelle
    if (this.cizilebilir) {
      if (this.silgiModu) {
        document.body.classList.add('silgi-aktif');
        document.body.classList.remove('kalem-aktif');
      } else {
        document.body.classList.add('kalem-aktif');
        document.body.classList.remove('silgi-aktif');
      }
    } else {
      document.body.classList.remove('kalem-aktif', 'silgi-aktif');
    }
  }

  ayarlaKalemOzellikleri(): void {
    if (!this.canvas) {
      console.log('Canvas henüz hazır değil');
      return;
    }

    // Canvas'ı çizim moduna al
    this.canvas.isDrawingMode = true;
    this.cizilebilir = true;

    // Brush'ı kontrol et
    if (!this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
    }

    // Kalem ayarlarını güncelle
    this.canvas.freeDrawingBrush.color = this.kalemRengi;
    this.canvas.freeDrawingBrush.width = this.kalemKalinligi;

    // İnce çizgiler için ek ayarlar (fabric.js versiyonuna göre)
    try {
      // getInk özelliği bazı fabric.js versiyonlarında olmayabilir
      // bu yüzden hata kontrolü ile yaklaşıyoruz
      if (this.canvas.freeDrawingBrush.hasOwnProperty('getInk')) {
        (this.canvas.freeDrawingBrush as any).getInk = false;
      }
    } catch (e) {
      console.log('getInk özelliği bu fabric.js versiyonunda desteklenmiyor');
    }

    // Log info
    console.log('Kalem ayarları güncellendi:', this.kalemRengi, this.kalemKalinligi);
    console.log('Canvas çizim modu:', this.canvas.isDrawingMode);
  }

  silgiModunuAc(): void {
    if (!this.silgiModu) {
      this.silgiModu = true;
      // Önceki kalem ayarlarını kaydet
      this.oncekiKalemRengi = this.kalemRengi;
      this.oncekiKalemKalinligi = this.kalemKalinligi;

      // Silgi modunu etkinleştir (beyaz kalem)
      this.kalemRengi = '#FFFFFF';
      this.kalemKalinligi = Math.max(15, this.kalemKalinligi); // Silgi en az 15px olsun
      this.ayarlaKalemOzellikleri();

      // İmleç stilini güncelle
      document.body.classList.add('silgi-aktif');
      document.body.classList.remove('kalem-aktif');

      // Canvas container elemanını bul ve cursor stilini güncelle
      const upperCanvas = document.querySelector('.canvas-container .upper-canvas') as HTMLCanvasElement;
      if (upperCanvas) {
        upperCanvas.style.cursor = 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="%23000000" d="M15.14 3c-.51 0-1.02.2-1.41.59L2.59 14.73c-.78.77-.78 2.04 0 2.83L5.03 20h7.94l-1.72-1.72-4.47.01-1.41-1.41 8.84-8.84 1.42 1.41 1.72-1.72-5.47-5.47c-.39-.39-.9-.59-1.41-.59M21 19.5c0 .83-.67 1.5-1.5 1.5h-5.25l1.73-1.73 3.52-.01V19.5z"/></svg>\') 0 24, auto';
      }
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

  // Tam ekran modunu açıp kapatma
  toggleTamEkran(): void {
    this.tamEkranModu = !this.tamEkranModu;

    const pdfContainer = document.querySelector('.pdf-container') as HTMLElement;

    if (this.tamEkranModu) {
      document.body.classList.add('tam-ekran-aktif');
    } else {
      document.body.classList.remove('tam-ekran-aktif');
    }

    // Canvas'ı yeniden boyutlandır
    setTimeout(() => {
      this.canvasBoyutlandir();
    }, 300);
  }

  // PDF'i büyütme
  pdfBuyut(): void {
    this.zoom += 0.25;
    if (this.zoom > 3) this.zoom = 3; // Maksimum 3x zoom

    this.updateZoomScale();
  }

  // PDF'i küçültme
  pdfKucult(): void {
    this.zoom -= 0.25;
    if (this.zoom < 0.5) this.zoom = 0.5; // Minimum 0.5x zoom

    this.updateZoomScale();
  }

  // Zoom ölçeğini güncelleme
  private updateZoomScale(): void {
    const pdfViewerElement = document.querySelector('pdf-viewer') as HTMLElement;
    if (pdfViewerElement) {
      pdfViewerElement.style.transform = `scale(${this.zoom})`;
      pdfViewerElement.style.transformOrigin = 'center top';
    }
  }

  kaydet(): void {
    if (!this.secilenGrup) {
      alert('Lütfen bir öğrenci grubu seçiniz!');
      return;
    }

    this.kaydetmeIsleminde = true;

    // Canvas içeriğini PNG olarak alıyoruz
    const dataURL = this.canvas.toDataURL({
      format: 'png',
      quality: 0.8,
      multiplier: 1.0
    });

    // Burada backend'e kaydedilecek veriyi gönderebilirsiniz
    // Örneğin:
    /*
    const kayitVerisi = {
      pdfAdi: this.secilenPDF,
      sayfa: this.currentPage,
      cizimVerisi: dataURL,
      ogrenciGrubu: this.secilenGrup,
      tarih: new Date()
    };

    this.apiServis.konuKaydet(kayitVerisi).subscribe(
      response => {
        alert('Konu anlatımı başarıyla kaydedildi!');
        this.kaydetmeIsleminde = false;
      },
      error => {
        alert('Kaydetme sırasında bir hata oluştu!');
        this.kaydetmeIsleminde = false;
      }
    );
    */

    // Şimdilik sadece simüle ediyoruz
    setTimeout(() => {
      alert(`"${this.secilenPDF}" dosyasının ${this.currentPage}. sayfası "${this.secilenGrup}" için kaydedildi.`);
      this.kaydetmeIsleminde = false;
    }, 1000);
  }

    // Sayfa terk edildiğinde uyarı mesajı göster
  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: any) {
    if (this.cizilebilir && this.canvas && this.canvas.getObjects().length > 0) {
      event.returnValue = 'Sayfadan ayrılmak istediğinize emin misiniz? Yapılan değişiklikler kaybolabilir.';
      return event.returnValue;
    }
    return true;
  }
}