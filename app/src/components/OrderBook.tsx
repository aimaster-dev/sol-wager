import React from 'react';
import { formatSol, formatTokenAmount, getOrderStatusText } from '../utils/format';
import { OrderStatus } from '../utils/constants';

interface OrderBookProps {
  orders: any[];
  currentUserPubkey: string;
  onCancelOrder: (orderPDA: string) => void;
}

const OrderBook: React.FC<OrderBookProps> = ({
  orders,
  currentUserPubkey,
  onCancelOrder
}) => {
  // Filter orders by type
  const buyYesOrders = orders.filter(order => order.account.isBuy && order.account.isYesToken);
  const sellYesOrders = orders.filter(order => !order.account.isBuy && order.account.isYesToken);
  const buyNoOrders = orders.filter(order => order.account.isBuy && !order.account.isYesToken);
  const sellNoOrders = orders.filter(order => !order.account.isBuy && !order.account.isYesToken);
  
  return (
    <div className="order-book">
      <div className="row">
        <div className="col-md-6 mb-4">
          <h4>YES Token Orders</h4>
          
          <h5>Buy Orders</h5>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {buyYesOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center">No buy orders</td>
                  </tr>
                ) : (
                  buyYesOrders.map((order, index) => (
                    <tr key={index}>
                      <td>{formatSol(order.account.price)} SOL</td>
                      <td>{formatTokenAmount(order.account.remainingQuantity)}</td>
                      <td>{formatSol(order.account.price * order.account.remainingQuantity / 1_000_000_000)} SOL</td>
                      <td>
                        {order.account.owner === currentUserPubkey && order.account.status === OrderStatus.Active && (
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => onCancelOrder(order.publicKey)}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <h5>Sell Orders</h5>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sellYesOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center">No sell orders</td>
                  </tr>
                ) : (
                  sellYesOrders.map((order, index) => (
                    <tr key={index}>
                      <td>{formatSol(order.account.price)} SOL</td>
                      <td>{formatTokenAmount(order.account.remainingQuantity)}</td>
                      <td>{formatSol(order.account.price * order.account.remainingQuantity / 1_000_000_000)} SOL</td>
                      <td>
                        {order.account.owner === currentUserPubkey && order.account.status === OrderStatus.Active && (
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => onCancelOrder(order.publicKey)}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="col-md-6">
          <h4>NO Token Orders</h4>
          
          <h5>Buy Orders</h5>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {buyNoOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center">No buy orders</td>
                  </tr>
                ) : (
                  buyNoOrders.map((order, index) => (
                    <tr key={index}>
                      <td>{formatSol(order.account.price)} SOL</td>
                      <td>{formatTokenAmount(order.account.remainingQuantity)}</td>
                      <td>{formatSol(order.account.price * order.account.remainingQuantity / 1_000_000_000)} SOL</td>
                      <td>
                        {order.account.owner === currentUserPubkey && order.account.status === OrderStatus.Active && (
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => onCancelOrder(order.publicKey)}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <h5>Sell Orders</h5>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sellNoOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center">No sell orders</td>
                  </tr>
                ) : (
                  sellNoOrders.map((order, index) => (
                    <tr key={index}>
                      <td>{formatSol(order.account.price)} SOL</td>
                      <td>{formatTokenAmount(order.account.remainingQuantity)}</td>
                      <td>{formatSol(order.account.price * order.account.remainingQuantity / 1_000_000_000)} SOL</td>
                      <td>
                        {order.account.owner === currentUserPubkey && order.account.status === OrderStatus.Active && (
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => onCancelOrder(order.publicKey)}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderBook;