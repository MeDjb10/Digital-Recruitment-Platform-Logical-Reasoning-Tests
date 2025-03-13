import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SidebarComponent } from './pages/sidebar/sidebar.component';
import { NavbarComponent } from './pages/navbar/navbar.component';
import { BreadcrumbComponent } from './components/breadcrumb/breadcrumb.component';
import { GeneralStatsComponent } from './components/general-stats/general-stats.component';
import { UsersListComponent } from './components/users-list/users-list.component';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { TabViewModule } from 'primeng/tabview';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';

import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { ToastModule } from 'primeng/toast';

import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';

@NgModule({
  declarations: [
    // We don't redeclare components that are already standalone
    // DashboardComponent, SidebarComponent, NavbarComponent, BreadcrumbComponent are already standalone
    // Only declare non-standalone components here if you have any
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule,

    // Standalone components need to be imported
    DashboardComponent,
    SidebarComponent,
    NavbarComponent,
    BreadcrumbComponent,
    GeneralStatsComponent,
    UsersListComponent,

    // Third-party modules
    ButtonModule,
    RippleModule,
    MenuModule,
    TooltipModule,
    TableModule,
    DropdownModule,
    TabViewModule,
    SelectButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    MessagesModule,
    ToastModule,
    MessageModule,
  ],
})
export class DashboardModule {}
