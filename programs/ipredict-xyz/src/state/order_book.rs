use anchor_lang::prelude::*;
use crate::state::{OrderSide, TokenType};
use crate::constants::MAX_ORDERS_PER_BOOK;

#[account]
pub struct OrderBook {
    pub wager: Pubkey,
    pub next_order_id: u64,
    pub buy_orders_yes: Vec<Order>,
    pub sell_orders_yes: Vec<Order>,
    pub buy_orders_no: Vec<Order>,
    pub sell_orders_no: Vec<Order>,
    pub bump: u8,
}

impl OrderBook {
    pub const SIZE: usize = 8 + // discriminator
        32 + // wager
        8 + // next_order_id
        4 + (Order::SIZE * MAX_ORDERS_PER_BOOK) + // buy_orders_yes
        4 + (Order::SIZE * MAX_ORDERS_PER_BOOK) + // sell_orders_yes
        4 + (Order::SIZE * MAX_ORDERS_PER_BOOK) + // buy_orders_no
        4 + (Order::SIZE * MAX_ORDERS_PER_BOOK) + // sell_orders_no
        1 + // bump
        256; // padding
    
    pub fn add_order(&mut self, order: Order) -> Result<()> {
        let orders = match (order.side, order.token_type) {
            (OrderSide::Buy, TokenType::Yes) => &mut self.buy_orders_yes,
            (OrderSide::Sell, TokenType::Yes) => &mut self.sell_orders_yes,
            (OrderSide::Buy, TokenType::No) => &mut self.buy_orders_no,
            (OrderSide::Sell, TokenType::No) => &mut self.sell_orders_no,
        };
        
        if orders.len() >= MAX_ORDERS_PER_BOOK {
            return Err(crate::errors::IpredictError::OrderBookFull.into());
        }
        
        orders.push(order);
        
        // Sort by price (descending for buy, ascending for sell)
        match order.side {
            OrderSide::Buy => orders.sort_by(|a, b| b.price.cmp(&a.price)),
            OrderSide::Sell => orders.sort_by(|a, b| a.price.cmp(&b.price)),
        }
        
        Ok(())
    }
    
    pub fn remove_order(&mut self, order_id: u64, side: OrderSide, token_type: TokenType) -> Result<Order> {
        let orders = match (side, token_type) {
            (OrderSide::Buy, TokenType::Yes) => &mut self.buy_orders_yes,
            (OrderSide::Sell, TokenType::Yes) => &mut self.sell_orders_yes,
            (OrderSide::Buy, TokenType::No) => &mut self.buy_orders_no,
            (OrderSide::Sell, TokenType::No) => &mut self.sell_orders_no,
        };
        
        let position = orders.iter().position(|o| o.id == order_id)
            .ok_or(crate::errors::IpredictError::OrderNotFound)?;
        
        Ok(orders.remove(position))
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct Order {
    pub id: u64,
    pub owner: Pubkey,
    pub side: OrderSide,
    pub token_type: TokenType,
    pub price: u64, // Price per token in lamports
    pub quantity: u64,
    pub filled_quantity: u64,
    pub timestamp: i64,
}

impl Order {
    pub const SIZE: usize = 8 + // id
        32 + // owner
        1 + // side
        1 + // token_type
        8 + // price
        8 + // quantity
        8 + // filled_quantity
        8; // timestamp
    
    pub fn remaining_quantity(&self) -> u64 {
        self.quantity.saturating_sub(self.filled_quantity)
    }
    
    pub fn is_filled(&self) -> bool {
        self.filled_quantity >= self.quantity
    }
}