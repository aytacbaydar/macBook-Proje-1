
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
  canvas: fabric.Canvas;
  cizilebilir: boolean = true;
  currentPage: number = 1;
  totalPages: number = 0;
  ogrenciGruplari: string[] = ['9A Sınıfı', '10B Sınıfı', '11C Sınıfı', '12D Sınıfı'];
  secilenGrup: string = '';
  kaydetmeIsleminde: boolean = false;
  kalemRengi: string = '#000000';
  kalemKalinligi: number = 2;
  dosyaBoyutuUyarisi: boolean = false;
  maxDosyaBoyutu: number = 16 * 1024 * 1024; // 16 MB

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.canvas = new fabric.Canvas(this.canvasElement.nativeElement, {
      isDrawingMode: true,
      width: 800,
      height: 600
    });

    // Kalem ayarlarını yapılandır
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
      this.pdfYuklendi = true;
      this.dosyaBoyutuUyarisi = false;
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
    if (this.canvas) {
      this.canvas.freeDrawingBrush.color = this.kalemRengi;
      this.canvas.freeDrawingBrush.width = this.kalemKalinligi;
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
      quality: 0.8
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
