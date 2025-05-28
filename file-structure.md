# General Wager Bet - Codebase Structure

## Project Root
```
general-wager-bet/
├── Anchor.toml                        # Anchor configuration file
├── Cargo.toml                         # Rust dependencies for Solana program
├── package.json                       # Node.js dependencies
├── tsconfig.json                      # TypeScript configuration
├── README.md                          # Project documentation
│
├── programs/                          # Solana programs (Rust)
│   └── general-wager-bet/
│       ├── src/
│       │   ├── lib.rs                 # Main program code
│       │   └── order_matching.rs      # Order matching implementation
│       └── Cargo.toml                 # Program-specific dependencies
│
├── app/                               # Frontend application (React/TypeScript)
│   ├── public/                        # Static assets
│   └── src/
│       ├── App.tsx                    # Main application component
│       ├── App.css                    # Global styles
│       ├── index.tsx                  # Application entry point
│       ├── index.css                  # Reset and base styles
│       ├── components/                # React components
│       │   ├── Navigation.tsx         # Navigation component
│       │   ├── Dashboard.tsx          # Dashboard component
│       │   ├── WagerCreationForm.tsx  # Form for creating wagers
│       │   ├── WagerDetails.tsx       # Wager details view
│       │   ├── OrderBook.tsx          # Order book component
│       │   └── MyBets.tsx             # User's bets component
│       ├── client/                    # Solana client interface
│       │   └── general-wager-bet-client.ts # Client for interacting with program
│       └── utils/                     # Utility functions
│           ├── constants.ts           # Constants and configuration
│           └── format.ts              # Formatting utilities
│
├── tests/                             # Integration tests
│   └── general-wager-bet.ts           # Main test file
│
├── target/                            # Build artifacts (generated)
│   ├── types/                         # TypeScript type definitions
│   │   └── general_wager_bet.ts       # Generated TypeScript types
│   └── idl/                           # Interface Description Language
│       └── general_wager_bet.json     # Generated IDL file
│
└── migrations/                        # Deployment scripts
    └── deploy.ts                      # Script to deploy the program
```

## Missing Files That Need to Be Created

1. **program/general-wager-bet/src/order_matching.rs**
   - Move the order matching implementation from separate file into this module

2. **app/src/utils/constants.ts**
   - Program ID
   - Network configuration
   - Other constants

3. **app/src/utils/format.ts**
   - Functions for formatting dates, prices, etc.

4. **app/src/index.tsx**
   - Entry point for React application

5. **tests/general-wager-bet.ts**
   - Integration tests for the Solana program

6. **migrations/deploy.ts**
   - Script to deploy the program to Solana

7. **app/src/index.css**
   - Base styles and CSS resets

8. **.env.local**
   - Environment variables for local development

## Changes Needed to Existing Files

1. **general-wager-bet-client.ts**
   - Update paths to IDL and type files
   - Implement proper token account creation
   - Add proper error handling

2. **lib.rs**
   - Integrate the real order matching implementation 
   - Add more validation checks

3. **App.tsx**
   - Replace placeholder data with real API calls
   - Add loading states and error handling

4. **Navigation.tsx**
   - Remove duplicate component code
   - Clean up file to only include navigation logic

5. **WagerDetails.tsx**
   - Replace placeholder token balance and order data
   - Implement real-time updates for orders

6. **OrderBook.tsx**
   - Add sorting and filtering options
   - Improve display of order book data
