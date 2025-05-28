// src/utils/format.ts
// Utility functions for formatting
import { WagerStatus, WagerResolution, OrderStatus } from './constants';

/**
 * Format SOL amount
 * @param lamports Amount in lamports
 * @param decimals Number of decimal places
 * @returns Formatted SOL amount
 */
export function formatSol(lamports: number, decimals: number = 3): string {
  return (lamports / 1_000_000_000).toFixed(decimals);
}

/**
 * Format token amount
 * @param rawAmount Amount in raw token units
 * @param decimals Number of decimal places
 * @returns Formatted token amount
 */
export function formatTokenAmount(rawAmount: number, decimals: number = 0): string {
  return (rawAmount / Math.pow(10, 9)).toFixed(decimals);
}

/**
 * Format timestamp to readable date
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Get the CSS class for a wager status
 * @param status Wager status
 * @returns CSS class
 */
export function getStatusClass(status: number): string {
  switch (status) {
    case WagerStatus.Created: return 'bg-secondary'; // Created
    case WagerStatus.Active: return 'bg-primary';   // Active
    case WagerStatus.Resolved: return 'bg-success';   // Resolved
    default: return 'bg-secondary';
  }
}

/**
 * Get the CSS class for a resolution
 * @param resolution Wager resolution
 * @returns CSS class
 */
export function getResolutionClass(resolution: number): string {
  switch (resolution) {
    case WagerResolution.Pending: return 'bg-secondary'; // Pending
    case WagerResolution.YesWon: return 'bg-success';   // YES Won
    case WagerResolution.NoWon: return 'bg-danger';    // NO Won
    case WagerResolution.Draw: return 'bg-info';      // Draw
    default: return 'bg-secondary';
  }
}

/**
 * Get the text for order status
 * @param status Order status
 * @returns Status text
 */
export function getOrderStatusText(status: number): string {
  switch (status) {
    case OrderStatus.Active: return 'Active';
    case OrderStatus.Filled: return 'Filled';
    case OrderStatus.PartiallyFilled: return 'Partially Filled';
    case OrderStatus.Cancelled: return 'Cancelled';
    case OrderStatus.PartiallyCancelled: return 'Partially Cancelled';
    default: return 'Unknown';
  }
}

/**
 * Get the text for wager status
 * @param status Wager status
 * @returns Status text
 */
export function getWagerStatusText(status: number): string {
  switch (status) {
    case WagerStatus.Created: return 'Created';
    case WagerStatus.Active: return 'Active';
    case WagerStatus.Resolved: return 'Resolved';
    default: return 'Unknown';
  }
}

/**
 * Get the text for wager resolution
 * @param resolution Wager resolution
 * @returns Resolution text
 */
export function getWagerResolutionText(resolution: number): string {
  switch (resolution) {
    case WagerResolution.Pending: return 'Pending';
    case WagerResolution.YesWon: return 'Yes Won';
    case WagerResolution.NoWon: return 'No Won';
    case WagerResolution.Draw: return 'Draw';
    default: return 'Unknown';
  }
}