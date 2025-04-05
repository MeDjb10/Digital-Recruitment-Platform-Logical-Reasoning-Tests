import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { ButtonModule } from 'primeng/button';

interface TestSection {
  name: string;
  route: string;
  expanded: boolean;
  icon: string; // Added icon property
  subsections: {
    name: string;
    route: string;
  }[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    TooltipModule,
    RippleModule,
    ButtonModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  
  @Input() collapsed = false;
  @Output() toggleCollapse = new EventEmitter<void>();
  
  tests: TestSection[] = [
  {
    name: 'Raisonnement Logique',
    route: 'RaisonnementLogique',
    expanded: false,
    icon: 'pi-chart-line',  // Changed from pi-brain which doesn't exist
    subsections: [
      { name: 'Liste des Tests', route: 'Tests' },
      { name: 'Statistiques', route: 'Statistique' },
      { name: 'Utilisateurs', route: 'Users' },
      
    ]
  },
  {
    name: 'Verbal Reasoning',
    route: 'VerbalReasoning',
    expanded: false,
    icon: 'pi-comments',  // Changed from pi-comment
    subsections: [
      { name: 'Statistics', route: 'Statistics' },
      { name: 'Users', route: 'Users' },
      { name: 'Tests', route: 'Tests' },
    ]
  }
];
  
  menuItems = [
    { label: 'Dashboard', icon: 'pi-chart-bar', route: '/dashboard/info' },
    { label: 'Users', icon: 'pi-users', route: '/dashboard/users' },
    { label: 'Settings', icon: 'pi-cog', route: '/dashboard/settings' }
  ];
  
  userName = 'Admin User';
  userRole = 'Administrator';
  userInitials = 'AU';
  currentRoute = '';

  constructor(private router: Router) {}

  ngOnInit() {
    // Track current route to highlight active menu items
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.urlAfterRedirects;
      
      // Auto-expand parent when child route is active
      this.tests.forEach(test => {
        if (this.currentRoute.includes(test.route)) {
          test.expanded = true;
        }
      });
    });
  }

  toggleSidebar() {
    this.toggleCollapse.emit(); // Fixed: This emits the event instead of calling it
  }

  toggleTest(test: TestSection) {
    if (this.collapsed) {
      test.expanded = !test.expanded;
    } else {
      this.tests.forEach(t => {
        if (t === test) {
          t.expanded = !t.expanded;
        } else {
          // Close other expanded items (accordion style)
          t.expanded = false;
        }
      });
    }
  }

  isChildActive(test: TestSection): boolean {
    return this.currentRoute.includes(test.route);
  }
  
  isRouteActive(route: string): boolean {
    return this.currentRoute === route;
  }
}