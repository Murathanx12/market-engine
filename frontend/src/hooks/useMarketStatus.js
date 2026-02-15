import { useQuery } from '@tanstack/react-query';
import { getMarketStatus } from '../services/api';

const useMarketStatus = () => {
  return useQuery({
    queryKey: ['marketStatus'],
    queryFn: getMarketStatus,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
};

export default useMarketStatus;
