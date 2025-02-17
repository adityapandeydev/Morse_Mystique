const API_URL = import.meta.env.VITE_API_URL;

interface RequestBody {
    email?: string;
    deviceID?: string;
    answer?: string;
    index?: number;
    totalTime?: number;
    solvedCount?: number;
}

type FetchConfig = {
    method: 'GET' | 'POST';
    body?: RequestBody;
    credentials?: RequestCredentials;
};

export async function fetchApi(endpoint: string, config: FetchConfig) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...config,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: config.credentials ?? 'include',
        body: config.body ? JSON.stringify(config.body) : undefined
    });
    
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.message);
    }
    return data;
} 