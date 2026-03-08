import React, { useState } from 'react';
import { ResolveButton, SelectNoButton, SelectYesButton, ConfirmResolveButton } from '../../buttons/marketDetails/ResolveButtons';
import { resolveMarket } from './ResolveUtils';
import { useMarketLabels } from '../../../hooks/useMarketLabels';

const ResolveModalButton = ({ marketId, token, market, onResolved }) => {
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [selectedResolution, setSelectedResolution] = useState(null);
    
    // Get custom labels for this market
    const { yesLabel, noLabel } = useMarketLabels(market);

    const toggleResolveModal = () => setShowResolveModal(prev => !prev);

    // handle resolution direction selection and confirmation logic
    const handleSelectNo = () => setSelectedResolution('NO');
    const handleSelectYes = () => setSelectedResolution('YES');

    const handleConfirm = () => {
        console.log("selectedResolution: ", selectedResolution)
        resolveMarket(marketId, token, selectedResolution)
            .then(data => {
                console.log("Resolution successful:", data);
                if (onResolved) onResolved();
            })
            .catch(error => {
                console.error("Failed to resolve market:", error);
            });
        setShowResolveModal(false);
    };

    return (
        <div>
            <ResolveButton onClick={toggleResolveModal} className="ml-6 w-10%" />
            {showResolveModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
                    <div className="resolve-modal relative bg-blue-900 p-6 rounded-lg text-white m-6 mx-auto" style={{ width: '350px' }}>
                        <h2 className="text-xl mb-4">Resolve Market</h2>

                        <div className="flex gap-3 mb-4">
                            <SelectYesButton onClick={handleSelectYes} isSelected={selectedResolution === 'YES'} label={yesLabel} />
                            <SelectNoButton onClick={handleSelectNo} isSelected={selectedResolution === 'NO'} label={noLabel} />
                        </div>

                        <div className="border-t border-gray-200 my-2"></div>

                        <div className="mt-4">
                            <ConfirmResolveButton onClick={handleConfirm} selectedResolution={selectedResolution} yesLabel={yesLabel} noLabel={noLabel} />
                        </div>

                        <button onClick={toggleResolveModal} className="absolute top-0 right-0 mt-4 mr-4 text-gray-400 hover:text-white">
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResolveModalButton;
