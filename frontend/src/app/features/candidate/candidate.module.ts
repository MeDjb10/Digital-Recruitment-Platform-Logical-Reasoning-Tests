import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';




/**
 * This module bundles all domino test related components and services.
 * It's not strictly necessary since we're using standalone components,
 * but it provides a convenient way to import everything at once.
 */
@NgModule({
  imports: [
    CommonModule,
    FormsModule,

    // Components
   
  ],
  exports: [
    // Expose components for use in other modules if needed
  
  ],
  providers: [],
})
export class CandidateModule {}
