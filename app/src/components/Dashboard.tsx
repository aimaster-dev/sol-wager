import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { formatDate } from '../utils/format';
import { WagerStatus, WagerResolution } from '../utils/constants';

interface DashboardProps {
  wagers: any[];
  onViewWager: (wager: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ wagers, onViewWager }) => {
  // Helper function to get wager status text
  const getStatusText = (status: number) => {
    switch (status) {
      case WagerStatus.Created: return 'Created';
      case WagerStatus.Active: return 'Active';
      case WagerStatus.Resolved: return 'Resolved';
      default: return 'Unknown';
    }
  };

  // Helper function to get resolution text
  const getResolutionText = (resolution: number) => {
    switch (resolution) {
      case WagerResolution.Pending: return 'Pending';
      case WagerResolution.YesWon: return 'Yes Won';
      case WagerResolution.NoWon: return 'No Won';
      case WagerResolution.Draw: return 'Draw';
      default: return 'Unknown';
    }
  };

  return (
    <div className="dashboard">
      <h2>Active Wagers</h2>
      
      {wagers.length === 0 ? (
        <div className="alert alert-info">
          No wagers have been created yet. Be the first to create one!
        </div>
      ) : (
        <div className="row">
          {wagers.map((wager, index) => (
            <div className="col-md-6 col-lg-4 mb-4" key={index}>
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">{wager.account.name}</h5>
                  <h6 className="card-subtitle mb-2 text-muted">
                    Status: {getStatusText(wager.account.status)}
                  </h6>
                  
                  <p className="card-text">
                    {wager.account.description.length > 100 
                      ? `${wager.account.description.substring(0, 100)}...` 
                      : wager.account.description}
                  </p>
                  
                  <div className="mb-3">
                    <small className="text-muted">
                      Opening: {formatDate(wager.account.openingTime)}
                    </small>
                    <br />
                    <small className="text-muted">
                      Conclusion: {formatDate(wager.account.conclusionTime)}
                    </small>
                  </div>
                  
                  {wager.account.status === WagerStatus.Resolved && (
                    <div className="alert alert-info">
                      Resolved: {getResolutionText(wager.account.resolution)}
                    </div>
                  )}
                  
                  <button 
                    className="btn btn-primary"
                    onClick={() => onViewWager({
                      publicKey: wager.publicKey,
                      account: wager.account
                    })}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;