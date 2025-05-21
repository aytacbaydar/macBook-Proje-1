
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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
  @ViewChild('canvas') canvasElement!: ElementRef;
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
  }

  ngAfterViewInit(): void {
    // Kısa bir gecikme ekleyerek canvas'ın düzgün oluşmasını sağlıyoruz
    setTimeout(() => {
      this.canvas = new fabric.Canvas(this.canvasElement.nativeElement, {
        isDrawingMode: true,
        width: window.innerWidth,
        height: window.innerHeight
      });
      
      // Kalem ayarlarını yapılandır
      this.ayarlaKalemOzellikleri();
      
      // Canvas boyutunu pencere boyutuna göre ayarla
      window.addEventListener('resize', () => {
        this.canvas.setWidth(window.innerWidth);
        this.canvas.setHeight(window.innerHeight);
        this.canvas.renderAll();
      });
    }, 300);
  }
  
  // Hızlı renk seçimi için metod
  hizliRenkSec(renk: string): void {
    this.kalemRengi = renk;
    this.silgiModu = false; // Renk seçildiğinde silgi modundan çık
    this.ayarlaKalemOzellikleri();
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
      this.pdfSrc = e.target.result;
      // Kısa bir gecikme ekleyerek yükleme işlemini daha güvenilir hale getiriyoruz
      setTimeout(() => {
        this.pdfYuklendi = true;
        this.dosyaBoyutuUyarisi = false;
        console.log('PDF yüklendi:', this.pdfSrc.substring(0, 50) + '...');  // PDF'in ilk kısmını kontrol için logla
      }, 100);
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
    
    // Canvas boyutunu PDF sayfasına göre ayarla - daha uzun bir bekleme süresi
    setTimeout(() => {
      if (this.canvas) {
        const pdfContainer = document.querySelector('.pdf-container');
        if (pdfContainer) {
          const width = pdfContainer.clientWidth;
          const height = pdfContainer.clientHeight;
          
          this.canvas.setWidth(width);
          this.canvas.setHeight(height);
          this.canvas.renderAll();
          
          // Canvas'ı PDF'in üzerine yerleştir
          const canvasEl = document.querySelector('.canvas-container canvas') as HTMLCanvasElement;
          if (canvasEl) {
            canvasEl.style.position = 'absolute';
            canvasEl.style.top = '0';
            canvasEl.style.left = '0';
            canvasEl.style.pointerEvents = this.cizilebilir ? 'auto' : 'none';
          }
        }
      }
    }, 500);
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
    this.canvas.clear();
  }

  toggleCizim(): void {
    this.cizilebilir = !this.cizilebilir;
    this.canvas.isDrawingMode = this.cizilebilir;
  }

  renkDegistir(event: any): void {
    this.kalemRengi = event.target.value;
    this.ayarlaKalemOzellikleri();
  }

  kalinlikDegistir(event: any): void {
    this.kalemKalinligi = Number(event.target.value);
    this.ayarlaKalemOzellikleri();
  }

  ayarlaKalemOzellikleri(): void {
    if (this.canvas && this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.color = this.kalemRengi;
      this.canvas.freeDrawingBrush.width = this.kalemKalinligi;
    }
  }
  
  silgiModunuAc(): void {
    if (!this.silgiModu) {
      this.silgiModu = true;
      // Önceki kalem ayarlarını kaydet
      this.oncekiKalemRengi = this.kalemRengi;
      this.oncekiKalemKalinligi = this.kalemKalinligi;
      
      // Silgi modunu etkinleştir (beyaz kalem)
      this.kalemRengi = '#FFFFFF';
      this.kalemKalinligi = 15; // Silgi daha kalın olsun
      this.ayarlaKalemOzellikleri();
    }
  }
  
  kalemModunuAc(): void {
    if (this.silgiModu) {
      this.silgiModu = false;
      // Önceki kalem ayarlarını geri yükle
      this.kalemRengi = this.oncekiKalemRengi;
      this.kalemKalinligi = this.oncekiKalemKalinligi;
      this.ayarlaKalemOzellikleri();
    }
  }

  // Tam ekran modunu açıp kapatma
  toggleTamEkran(): void {
    this.tamEkranModu = !this.tamEkranModu;
    
    const pdfContainer = document.querySelector('.pdf-container') as HTMLElement;
    const body = document.body;
    
    if (this.tamEkranModu) {
      pdfContainer.classList.add('tam-ekran');
      body.classList.add('tam-ekran-aktif');
    } else {
      pdfContainer.classList.remove('tam-ekran');
      body.classList.remove('tam-ekran-aktif');
    }
    
    // Canvas'ı yeniden boyutlandır
    setTimeout(() => {
      if (this.canvas) {
        const width = pdfContainer.clientWidth;
        const height = pdfContainer.clientHeight;
        
        this.canvas.setWidth(width);
        this.canvas.setHeight(height);
        this.canvas.renderAll();
      }
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
      
      // Canvas'ı da ölçeklendir
      if (this.canvas) {
        this.canvas.setZoom(this.zoom);
        this.canvas.renderAll();
      }
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
