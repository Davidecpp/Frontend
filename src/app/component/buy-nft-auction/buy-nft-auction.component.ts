import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { NFTService } from '../../nft.service';
import { AuthService } from '../../auth.service';
import { Subscription, interval } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-buy-nft-auction',
  templateUrl: './buy-nft-auction.component.html',
  styleUrl: './buy-nft-auction.component.css'
})
export class BuyNftAuctionComponent{
  nftmodel!: any;
  imageUrl: any;
  idsale!: any;
  address!: any;
  paymentMethods: string[] = ['USD', 'ETH'];
  selectedPaymentMethod!: any;
  alladdress: any []= [];

  intervalSubscription!: Subscription;


  constructor(private nftservice : NFTService, private auth : AuthService, private route: Router){}

  createEventSource() {
    var eventSource = new EventSource("http://localhost:9001/rt/test");

    eventSource.onmessage = (e) => {
        const obj = JSON.parse(e.data);
        obj.event; // Può essere "newOffer" o "end"
        obj.nftId; // Id dell'nft
        obj.value; // (Solo per newOffer) nuovo valore dell'nft
    };

    eventSource.onerror = (e) => {
        eventSource.close();
        eventSource = this.createEventSource();
    }

    return eventSource;
}

  calcolaDifferenzaTraTimestamp(timestamp1: string, timestamp2: string): number {
    const data1 = new Date(timestamp1);
    const data2 = new Date(timestamp2);

    const differenzaInMillisecondi = data2.getTime() - data1.getTime();
    const differenzaInSecondi = differenzaInMillisecondi / 1000;

    return differenzaInSecondi;
  }

  formatSecondsToTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const hoursString = String(hours).padStart(2, '0');
    const minutesString = String(minutes).padStart(2, '0');
    const secondsString = String(remainingSeconds).padStart(2, '0');

    return `${hoursString}:${minutesString}:${secondsString}`;
  }

  ngOnInit(): void {
    this.nftservice.getdbnft(this.nftservice.getnftid() ?? '').subscribe(data =>{

      this.nftservice.getsaletabel(data.id).subscribe(res=>{
        this.idsale=data.id;
        this.nftmodel= data;
        let durata = this.formatSecondsToTime(this.calcolaDifferenzaTraTimestamp(res.creationDate ,res.endTime));
        this.nftmodel['durata'] = durata;
        this.nftmodel['price']=res.price;
        this.image();
      });
    });
    this.createEventSource();

    const checkInterval = 1000;
    this.intervalSubscription = interval(checkInterval).subscribe(() => {
      this.checkduration();
    });
  }

  checkduration(){
    const nftId = this.nftservice.getnftid() ?? '';
    this.nftservice.getsaletabel(this.idsale).subscribe(res=>{
      const endtime= new Date(res.endTime);
      const currentTime = new Date();
      
      if(endtime <= currentTime){
        this.route.navigate(['/end-auction'])
      }
    })
  }

  ngOnDestroy(): void {
    if (this.intervalSubscription) {
      this.intervalSubscription.unsubscribe();
    }
  }

  image() {
    const id = this.nftservice.getnftid() ?? '';

    this.nftservice.getImage(id).subscribe(
      (data: ArrayBuffer) => {
        const uint8Array = new Uint8Array(data);
        const byteCharacters = uint8Array.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
        const imageUrl = 'data:image/png;base64,' + btoa(byteCharacters);
        this.imageUrl = imageUrl;
      },
      (error) => {
        console.error('Errore durante il recupero dell\'immagine', error);
      }
    );
  }

  makeoffer(){
    const nftId = this.nftservice.getnftid() ?? '';
    this.nftservice.getsaletabel(this.idsale).subscribe(res=>{
      this.auth.getwallet().subscribe((data: any[]) => {
        this.alladdress = data;
        if (this.selectedPaymentMethod=='USD'){
          for (let el of this.alladdress){
            if(el.type==1 && el.balance!=0){
              this.address= el.address;
            }
          }
        }
        if (this.selectedPaymentMethod=='ETH'){
          for (let el of this.alladdress){
            if(el.type==0 && el.balance!=0){
              this.address= el.address;
            }
          }
        }
        this.nftservice.offer(nftId, {idNft : this.nftservice.getnftid() ?? '', address: this.address, price : res.price})
      });
      })
    
    
  }

  report(){
    const id = this.nftservice.getnftid() ?? '';
    this.nftservice.reportnft(id);
  }


}







