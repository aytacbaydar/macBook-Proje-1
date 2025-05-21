import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KonuAnlatimSayfalariComponent } from './components/yönetici-sayfalari/konu-anlatim-sayfalari/konu-anlatim-sayfalari.component';

const routes: Routes = [
  { path: 'konu-anlatim', component: KonuAnlatimSayfalariComponent },
  { path: '', redirectTo: '/konu-anlatim', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }