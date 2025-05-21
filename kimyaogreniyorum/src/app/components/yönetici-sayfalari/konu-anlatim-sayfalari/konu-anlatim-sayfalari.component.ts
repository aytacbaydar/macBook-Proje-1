
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { fabric } from 'fabric';

@Component({
  selector: 'app-konu-anlatim-sayfalari',
  templateUrl: './konu-anlatim-sayfalari.component.html',
  styleUrls: ['./konu-anlatim-sayfalari.component.scss']
})
export class KonuAnlatimSayfalariComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvasElement: ElementRef;
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
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.pdfSrc = e.target.result;
        this.pdfYuklendi = true;
      };
      reader.readAsDataURL(file);
    }
  }

  pdfYuklendi(event: any): void {
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
