import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent implements OnInit {
  breadcrumbs: Array<{ name: string, route: any,personName?:any,sequence?:any,queryParams?:any,type?:any }> = [];

  constructor(private router: Router, private route: ActivatedRoute) {}
  subcription:any;
  ngOnInit(): void {
    this.valueBinder()  
    this.listen()
  }
  valueBinder(){
    const data = this.route.snapshot.data['dashboardData'];
    if (data && data.breadcrumb) {
      // directly assign breadcrumb array from resolver
      this.breadcrumbs = data.breadcrumb;
    } else {
      const route = this.route
      this.breadcrumbs = [{ name: 'Home', route: [route.url] }];
    }
  }
  listen(){
      this.subcription=this.route.params.subscribe(() => {
    this.valueBinder()  
    })
  }
  navigateTo(url: any,queryParams?:any) {
    this.router.navigate(url,{ queryParams: queryParams ,queryParamsHandling: 'merge'});
  }
  ngOnDestroy(){
    if(this.subcription){
      this.subcription.unsubscribe()
    }
  }
}
