import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';

interface Breadcrumb {
  label: string;
  url: string;
}

@Component({
  selector: 'app-breadcrumb',
  imports:[CommonModule,RouterLink],
  templateUrl: './breadcrumb.component.html',
})
export class BreadcrumbComponent implements OnInit {
  breadcrumbs: Breadcrumb[] = [];

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {}

  ngOnInit() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.breadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);
      });

    // Initial breadcrumbs
    this.breadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);
  }

  private createBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: Breadcrumb[] = []
  ): Breadcrumb[] {
    // Get the route children
    const children: ActivatedRoute[] = route.children;

    // Return if no children
    if (children.length === 0) {
      return breadcrumbs;
    }

    // For each child
    for (const child of children) {
      // Get the route URL
      const routeURL: string = child.snapshot.url
        .map((segment) => segment.path)
        .join('/');

      // Skip empty path segments
      if (routeURL !== '') {
        // Append route to URL
        url += `/${routeURL}`;

        // Add breadcrumb
        const breadcrumbLabel = this.getBreadcrumbLabel(routeURL);
        breadcrumbs.push({
          label: breadcrumbLabel,
          url: url,
        });
      }

      // Recursive call
      return this.createBreadcrumbs(child, url, breadcrumbs);
    }

    return breadcrumbs;
  }

  private getBreadcrumbLabel(path: string): string {
    // Map route paths to user-friendly labels
    const labelMap: { [key: string]: string } = {
      dashboard: 'Dashboard',
      info: 'Overview',
      users: 'Users',
      RaisonnementLogique: 'Logical Reasoning',
      Statistique: 'Statistics',
      Tests: 'Tests',
    };

    return labelMap[path] || this.capitalize(path);
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
