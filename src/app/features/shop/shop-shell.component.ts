import { Component, inject, computed, signal, HostListener, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-shop-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shop-shell.component.html',
  styleUrl: './shop-shell.component.scss',
})
export class ShopShellComponent {
  auth = inject(AuthService);
  private cartService = inject(CartService);
  private router = inject(Router);
  profileClicked = signal(false);
  // private elementRef = inject(ElementRef);
  @ViewChild('userMenu') userMenu!: ElementRef;

  cartCount = this.cartService.itemCount;

  initials(): string {
    const name = this.auth.currentUser()?.name ?? '';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  logout(): void {
    this.auth.logout();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {

    const clickedInside =
       this.userMenu?.nativeElement.contains(event.target);

    if (!clickedInside) {
      this.profileClicked.set(false);
    }
  }

  updateClick() {
    this.profileClicked.update(v => !v);
  }
}
