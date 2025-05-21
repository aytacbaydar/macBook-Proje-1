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
  kalemKalinligi: number = 2;
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

    // Canvas oluştur (PDF tamamen yüklendikten sonra)
    setTimeout(() => {
      this.canvasOlustur();
      
      // Canvas yüklendikten sonra tekrar pointer events ayarını yap
      setTimeout(() => {
        const canvasContainer = document.querySelector('.canvas-container') as HTMLElement;
        if (canvasContainer) {
          canvasContainer.style.pointerEvents = 'auto';
          
          const upperCanvas = document.querySelector('.upper-canvas') as HTMLCanvasElement;
          if (upperCanvas) {
            upperCanvas.style.pointerEvents = 'auto';
          }
        }
      }, 300);
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

      const width = pdfContainer.clientWidth;
      const height = pdfContainer.clientHeight;
      
      console.log('PDF konteyner boyutları:', width, 'x', height);

      // Canvas elementi boyutlandırma
      const canvasEl = this.canvasElement.nativeElement;
      canvasEl.width = width;
      canvasEl.height = height;

      // Eğer önceki canvas varsa temizle
      if (this.canvas) {
        this.canvas.dispose();
      }

      // Yeni fabric canvas oluştur
      this.canvas = new fabric.Canvas(canvasEl, {
        isDrawingMode: true,
        width: width,
        height: height,
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
        
        // Upper canvas
        const upperCanvas = document.querySelector('.canvas-container .upper-canvas') as HTMLCanvasElement;
        if (upperCanvas) {
          upperCanvas.style.pointerEvents = 'auto';
        }
      }

      console.log('Canvas oluşturuldu:', width, 'x', height);

      // Kalem modunu aktifleştir
      this.cizilebilir = true;
      this.canvas.isDrawingMode = true;
      document.body.classList.add('kalem-aktif');
      document.body.classList.remove('silgi-aktif');

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

  oncekiSayfa(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.temizleCanvas();
    }
  }

  sonrakiSayfa(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.temizleCanvas();
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
    
    // Çizim ince çizgiler oluşturmasın
    if (this.canvas.freeDrawingBrush.getInk) {
      this.canvas.freeDrawingBrush.getInk = false;
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
      this.kalemKalinligi = 15;
      this.ayarlaKalemOzellikleri();

      // İmleç stilini güncelle
      document.body.classList.add('silgi-aktif');
      document.body.classList.remove('kalem-aktif');
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
    if (this.zoom > 3) this.zoom = 1; // 3x zoom sonrası yeniden başlat

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
}