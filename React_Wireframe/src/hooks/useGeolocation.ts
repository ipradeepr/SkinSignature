import { useState, useCallback } from 'react';

interface LocationData {
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  humidity?: number;
  temperature?: number;
}

export const useGeolocation = () => {
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);

  const getUserLocation = useCallback(async () => {
    if (!navigator.geolocation) return null;
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const { latitude, longitude } = position.coords;
      
      // Get weather/climate data for better foundation recommendations
      try {
        // Note: In production, you would use a real weather API key
        const weatherResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=YOUR_API_KEY`
        );
        const weatherData = await weatherResponse.json();
        
        setUserLocation({
          latitude,
          longitude,
          city: weatherData.name,
          country: weatherData.sys.country,
          humidity: weatherData.main.humidity,
          temperature: weatherData.main.temp
        });
      } catch {
        // Fallback without weather data
        setUserLocation({ latitude, longitude });
      }
    } catch (error) {
      console.log('Location access denied');
    }
  }, []);

  return { userLocation, getUserLocation };
};