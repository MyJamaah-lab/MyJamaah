import AsyncStorage from '@react-native-async-storage/async-storage';

const PRAYER_METHOD_KEY = 'prayer_calculation_method';

export type CalculationMethod = 'ISNA' | 'MWL';

export type PrayerTimes = {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  date: string;
};

function getMethodCode(method: CalculationMethod): number {
  return method === 'ISNA' ? 2 : 3;
}

export async function fetchPrayerTimes(
  latitude: number,
  longitude: number,
  method: CalculationMethod = 'ISNA'
): Promise<PrayerTimes | null> {
  try {
    const methodCode = getMethodCode(method);
    const url = `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=${methodCode}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 200 || !data.data) {
      console.error('API error:', data);
      return null;
    }

    const timings = data.data.timings;
    const date = data.data.date.readable;

    return {
      fajr: timings.Fajr,
      dhuhr: timings.Dhuhr,
      asr: timings.Asr,
      maghrib: timings.Maghrib,
      isha: timings.Isha,
      date,
    };
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    return null;
  }
}

export async function saveCalculationMethod(method: CalculationMethod): Promise<void> {
  try {
    await AsyncStorage.setItem(PRAYER_METHOD_KEY, method);
  } catch (error) {
    console.error('Error saving calculation method:', error);
  }
}

export async function loadCalculationMethod(): Promise<CalculationMethod> {
  try {
    const method = await AsyncStorage.getItem(PRAYER_METHOD_KEY);
    return (method as CalculationMethod) || 'ISNA';
  } catch (error) {
    console.error('Error loading calculation method:', error);
    return 'ISNA';
  }
}

export function getCurrentPrayer(times: PrayerTimes): {
  current: string | null;
  next: string;
  nextTime: string;
} {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const prayers = [
    { name: 'Fajr', time: times.fajr },
    { name: 'Dhuhr', time: times.dhuhr },
    { name: 'Asr', time: times.asr },
    { name: 'Maghrib', time: times.maghrib },
    { name: 'Isha', time: times.isha },
  ];

  const prayerMinutes = prayers.map((p) => {
    const [hours, minutes] = p.time.split(':').map(Number);
    return { ...p, minutes: hours * 60 + minutes };
  });

  let current: string | null = null;
  let next = 'Fajr';
  let nextTime = times.fajr;

  for (let i = 0; i < prayerMinutes.length; i++) {
    const prayer = prayerMinutes[i];
    const nextPrayer = prayerMinutes[i + 1];

    if (currentTime >= prayer.minutes) {
      current = prayer.name;
      
      if (nextPrayer) {
        next = nextPrayer.name;
        nextTime = nextPrayer.time;
      } else {
        next = 'Fajr';
        nextTime = times.fajr;
      }
    }
  }

  return { current, next, nextTime };
}
