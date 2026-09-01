import { useEffect, useState } from 'react';
import {
  assignAsset,
  deleteAsset,
  fetchAssetDetail,
  returnAsset,
  updateAsset,
  updateAssetStatus,
} from '../services/assets-api.js';

export function useAssetDetail(assetId) {
  const [asset, setAsset] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    if (!assetId) {
      setAsset(null);
      return null;
    }

    setIsLoading(true);
    setError('');

    try {
      const detail = await fetchAssetDetail(assetId);
      setAsset(detail);
      return detail;
    } catch (loadError) {
      setError(loadError.message || 'Failed to load asset detail.');
      setAsset(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [assetId]);

  async function runMutation(callback) {
    setIsMutating(true);
    setError('');
    try {
      const result = await callback();
      await refresh();
      return result;
    } catch (mutationError) {
      setError(mutationError.message || 'Asset update failed.');
      throw mutationError;
    } finally {
      setIsMutating(false);
    }
  }

  return {
    asset,
    error,
    isLoading,
    isMutating,
    refresh,
    assign: (payload) => runMutation(() => assignAsset(assetId, payload)),
    remove: () => runMutation(() => deleteAsset(assetId)),
    returnAsset: (payload) => runMutation(() => returnAsset(assetId, payload)),
    update: (payload) => runMutation(() => updateAsset(assetId, payload)),
    updateStatus: (payload) => runMutation(() => updateAssetStatus(assetId, payload)),
  };
}
