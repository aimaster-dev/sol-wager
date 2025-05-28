import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { formatDate } from '../utils/format';
import { WagerStatus, WagerResolution } from '../utils/constants';

interface MyBetsProps {
  wagers: any[];
  onViewWager: (wager: any) => void;
  currentUserPubkey: string;
}

const MyBets: React.FC<MyBetsProps> = ({ wagers, onViewWager, currentUserPubkey }) => {
  const [userWagers, setUserWagers] = useState<any[]>([]);
  const [tokenBalances, setTokenBalances] = useState<{[key: string]: {yes: number, no: number}}>({});
  
  // Fetch user's wagers and token balances
  useEffect(() => {
    const fetchUserData = async () => {
      // Filter wagers created by the user
      const createdWagers = wagers.filter(wager => 
        wager.account.authority === currentUserPubkey
      );
      
      // For a real implementation, you would also fetch wagers where the user has token balances
      // For now, let's assume the user has tokens for all wagers
      
      // Simulate token balances (in a real app, you would fetch these from the blockchain)
      const balances: {[key: string]: {yes: number, no: number}} = {};
      
      for (const wager of wagers) {
        balances[wager.publicKey.toString()] = {
          yes: Math.floor(Math.random() * 100),
          no: Math.floor(Math.random() * 100)
        };
      }
      
      setTokenBalances(balances);
      setUserWagers(wagers);
    };
    
    fetchUserData();
  }, [wagers, currentUserPubkey]);
  
  return (
    <div className="my-bets">
      <h2>My Bets</h2>
      
      {userWagers.length === 0 ? (
        <div className="alert alert-info">
          You haven't participated in any wagers yet.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Wager</th>
                <th>Status</th>
                <th>Conclusion Time</th>
                <th>YES Tokens</th>
                <th>NO Tokens</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {userWagers.map((wager, index) => {
                const wagerKey = wager.publicKey;
                const balances = tokenBalances[wagerKey] || { yes: 0, no: 0 };
                
                return (
                  <tr key={index}>
                    <td>{wager.account.name}</td>
                    <td>
                      {wager.account.status === WagerStatus.Created ? 'Created' : 
                       wager.account.status === WagerStatus.Active ? 'Active' : 
                       wager.account.status === WagerStatus.Resolved ? 'Resolved' : 'Unknown'}
                      {wager.account.status === WagerStatus.Resolved && (
                        <span className="ms-2 badge bg-info">
                          {wager.account.resolution === WagerResolution.Pending ? 'Pending' :
                           wager.account.resolution === WagerResolution.YesWon ? 'Yes Won' :
                           wager.account.resolution === WagerResolution.NoWon ? 'No Won' :
                           wager.account.resolution === WagerResolution.Draw ? 'Draw' : 'Unknown'}
                        </span>
                      )}
                    </td>
                    <td>{formatDate(wager.account.conclusionTime)}</td>
                    <td>{balances.yes}</td>
                    <td>{balances.no}</td>
                    <td>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => onViewWager({
                          publicKey: wager.publicKey,
                          account: wager.account
                        })}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyBets;