/**
 * Comprehensive World Geographic Data for Interactive 3D Atmosphere Globe
 * Contains verified boundary polygons for world countries and major global cities.
 */

export interface WorldCountry {
  id: string;
  name: string;
  continent: string;
  lat: number;
  lon: number;
  polygons: Array<Array<[number, number]>>; // [lat, lon] coordinates in degrees
}

export interface WorldCity {
  name: string;
  country: string;
  lat: number;
  lon: number;
  tier: 1 | 2 | 3; // 1 = global megacities (always visible), 2 = regional hubs, 3 = high-zoom cities
  isCapital?: boolean;
}

export const WORLD_COUNTRIES: WorldCountry[] = [
  // --- NORTH AMERICA ---
  {
    id: 'USA',
    name: 'United States',
    continent: 'North America',
    lat: 38.0,
    lon: -97.0,
    polygons: [
      // Continental US
      [
        [49.0, -123.3], [49.0, -95.1], [48.0, -89.5], [45.0, -74.8], [45.0, -71.5],
        [47.4, -69.2], [44.8, -66.9], [41.2, -72.0], [38.9, -77.0], [30.4, -81.5],
        [25.0, -80.4], [25.8, -81.7], [29.9, -84.3], [30.2, -88.0], [29.9, -90.1],
        [29.3, -94.8], [26.0, -97.1], [26.0, -98.3], [28.7, -100.5], [29.8, -104.5],
        [31.8, -106.5], [31.3, -108.2], [31.3, -111.0], [32.5, -117.1], [34.4, -119.8],
        [37.8, -122.5], [42.0, -124.2], [46.2, -124.0], [48.4, -124.7], [49.0, -123.3],
      ],
      // Alaska
      [
        [71.3, -156.5], [70.0, -141.0], [60.3, -141.0], [59.0, -137.0], [55.0, -131.0],
        [57.0, -135.0], [60.0, -149.0], [59.0, -154.0], [54.0, -164.0], [58.0, -160.0],
        [64.0, -166.0], [66.0, -168.0], [69.0, -163.0], [71.3, -156.5],
      ],
    ],
  },
  {
    id: 'CAN',
    name: 'Canada',
    continent: 'North America',
    lat: 56.0,
    lon: -106.0,
    polygons: [
      [
        [49.0, -123.3], [54.0, -130.0], [60.0, -139.0], [69.5, -140.0], [69.0, -136.0],
        [70.0, -128.0], [68.0, -114.0], [68.0, -100.0], [63.0, -90.0], [62.0, -78.0],
        [58.0, -68.0], [58.0, -63.0], [52.0, -56.0], [47.0, -53.0], [46.0, -60.0],
        [44.0, -64.0], [45.0, -67.0], [45.0, -74.8], [48.0, -89.5], [49.0, -95.1],
        [49.0, -123.3],
      ],
    ],
  },
  {
    id: 'MEX',
    name: 'Mexico',
    continent: 'North America',
    lat: 23.6,
    lon: -102.5,
    polygons: [
      [
        [32.5, -117.1], [31.3, -111.0], [31.8, -106.5], [29.8, -104.5], [26.0, -97.1],
        [22.2, -97.8], [18.5, -92.6], [21.5, -87.1], [18.2, -87.8], [16.0, -92.3],
        [15.8, -96.5], [17.5, -101.5], [20.7, -105.3], [24.0, -107.5], [28.0, -111.5],
        [31.8, -116.6], [32.5, -117.1],
      ],
    ],
  },
  {
    id: 'CUB',
    name: 'Cuba',
    continent: 'North America',
    lat: 21.5,
    lon: -79.0,
    polygons: [
      [
        [21.8, -84.9], [23.1, -82.3], [23.2, -80.5], [21.1, -74.2], [19.8, -75.0],
        [20.0, -77.5], [22.0, -80.5], [21.8, -84.9],
      ],
    ],
  },
  {
    id: 'GRL',
    name: 'Greenland',
    continent: 'North America',
    lat: 72.0,
    lon: -40.0,
    polygons: [
      [
        [83.0, -30.0], [76.0, -18.0], [65.0, -40.0], [60.0, -45.0], [70.0, -54.0],
        [78.0, -68.0], [82.0, -50.0], [83.0, -30.0],
      ],
    ],
  },

  // --- SOUTH AMERICA ---
  {
    id: 'BRA',
    name: 'Brazil',
    continent: 'South America',
    lat: -14.2,
    lon: -51.9,
    polygons: [
      [
        [4.4, -51.5], [-1.0, -46.0], [-5.0, -35.5], [-12.0, -37.5], [-23.0, -42.0],
        [-30.0, -50.0], [-33.7, -53.4], [-30.0, -57.5], [-25.5, -54.5], [-19.0, -58.0],
        [-16.0, -60.0], [-10.0, -69.0], [-7.0, -73.0], [2.0, -70.0], [5.0, -60.5],
        [4.4, -51.5],
      ],
    ],
  },
  {
    id: 'ARG',
    name: 'Argentina',
    continent: 'South America',
    lat: -38.4,
    lon: -63.6,
    polygons: [
      [
        [-22.0, -65.5], [-22.0, -62.5], [-27.5, -58.5], [-34.5, -58.5], [-39.0, -62.0],
        [-46.0, -66.0], [-54.5, -67.0], [-52.0, -72.0], [-45.0, -72.0], [-33.0, -70.0],
        [-26.0, -68.5], [-22.0, -65.5],
      ],
    ],
  },
  {
    id: 'CHL',
    name: 'Chile',
    continent: 'South America',
    lat: -35.6,
    lon: -71.5,
    polygons: [
      [
        [-18.0, -70.3], [-18.0, -69.0], [-26.0, -68.5], [-33.0, -70.0], [-45.0, -72.0],
        [-52.0, -72.0], [-55.0, -68.0], [-54.0, -73.0], [-44.0, -75.0], [-30.0, -71.5],
        [-22.0, -70.3], [-18.0, -70.3],
      ],
    ],
  },
  {
    id: 'COL',
    name: 'Colombia',
    continent: 'South America',
    lat: 4.5,
    lon: -73.2,
    polygons: [
      [
        [12.4, -71.7], [11.5, -74.0], [8.0, -77.0], [1.5, -78.8], [-4.2, -70.0],
        [1.0, -67.0], [6.0, -67.5], [7.0, -72.0], [12.4, -71.7],
      ],
    ],
  },
  {
    id: 'PER',
    name: 'Peru',
    continent: 'South America',
    lat: -9.1,
    lon: -75.0,
    polygons: [
      [
        [-0.0, -75.2], [-4.2, -70.0], [-10.0, -69.0], [-17.0, -69.5], [-18.0, -70.3],
        [-15.0, -75.0], [-8.0, -79.0], [-3.5, -80.5], [-0.0, -75.2],
      ],
    ],
  },
  {
    id: 'VEN',
    name: 'Venezuela',
    continent: 'South America',
    lat: 6.4,
    lon: -66.5,
    polygons: [
      [
        [12.0, -71.0], [10.5, -62.0], [8.5, -60.0], [5.0, -60.5], [1.0, -66.0],
        [3.0, -67.5], [6.0, -67.5], [7.0, -72.0], [12.0, -71.0],
      ],
    ],
  },

  // --- EUROPE ---
  {
    id: 'GBR',
    name: 'United Kingdom',
    continent: 'Europe',
    lat: 55.3,
    lon: -3.4,
    polygons: [
      [
        [58.6, -3.1], [57.5, -1.8], [52.8, 1.7], [51.1, 1.4], [50.0, -5.2],
        [51.6, -5.0], [53.3, -4.5], [54.8, -3.2], [55.8, -4.9], [58.6, -5.0],
        [58.6, -3.1],
      ],
    ],
  },
  {
    id: 'FRA',
    name: 'France',
    continent: 'Europe',
    lat: 46.6,
    lon: 2.2,
    polygons: [
      [
        [51.0, 2.5], [49.5, 5.8], [47.5, 7.5], [45.8, 6.8], [43.5, 7.0],
        [43.0, 3.0], [42.4, 3.1], [43.3, -1.7], [46.0, -1.2], [48.3, -4.7],
        [49.7, -1.9], [51.0, 2.5],
      ],
    ],
  },
  {
    id: 'DEU',
    name: 'Germany',
    continent: 'Europe',
    lat: 51.1,
    lon: 10.4,
    polygons: [
      [
        [54.8, 8.5], [54.5, 10.0], [54.0, 14.1], [51.0, 15.0], [50.8, 12.0],
        [48.6, 13.5], [47.5, 13.0], [47.5, 9.5], [47.5, 7.5], [49.5, 6.0],
        [52.0, 6.8], [53.5, 7.0], [54.8, 8.5],
      ],
    ],
  },
  {
    id: 'ESP',
    name: 'Spain',
    continent: 'Europe',
    lat: 40.4,
    lon: -3.7,
    polygons: [
      [
        [43.5, -1.8], [42.4, 3.1], [41.0, 1.0], [36.7, -2.1], [36.0, -5.6],
        [37.0, -7.4], [41.8, -8.8], [43.5, -9.0], [43.5, -1.8],
      ],
    ],
  },
  {
    id: 'ITA',
    name: 'Italy',
    continent: 'Europe',
    lat: 41.8,
    lon: 12.5,
    polygons: [
      [
        [46.5, 11.5], [46.0, 13.5], [44.5, 12.3], [41.0, 16.0], [40.0, 18.0],
        [38.0, 16.0], [38.0, 15.0], [40.5, 14.0], [44.0, 10.0], [44.5, 8.0],
        [46.0, 6.8], [46.5, 11.5],
      ],
    ],
  },
  {
    id: 'NLD',
    name: 'Netherlands',
    continent: 'Europe',
    lat: 52.1,
    lon: 5.2,
    polygons: [
      [
        [53.5, 6.8], [52.8, 7.1], [51.2, 5.9], [51.4, 3.6], [53.0, 4.8],
        [53.5, 6.8],
      ],
    ],
  },
  {
    id: 'CHE',
    name: 'Switzerland',
    continent: 'Europe',
    lat: 46.8,
    lon: 8.2,
    polygons: [
      [
        [47.7, 8.5], [47.5, 9.5], [46.5, 10.4], [45.9, 9.0], [46.2, 6.0],
        [47.3, 7.0], [47.7, 8.5],
      ],
    ],
  },
  {
    id: 'GRC',
    name: 'Greece',
    continent: 'Europe',
    lat: 39.0,
    lon: 22.0,
    polygons: [
      [
        [41.5, 23.5], [41.0, 26.0], [38.5, 24.0], [36.5, 23.0], [38.0, 21.0],
        [40.0, 20.0], [41.5, 23.5],
      ],
    ],
  },
  {
    id: 'POL',
    name: 'Poland',
    continent: 'Europe',
    lat: 51.9,
    lon: 19.1,
    polygons: [
      [
        [54.3, 14.3], [54.5, 18.5], [54.3, 22.8], [52.0, 23.5], [50.0, 22.5],
        [49.5, 19.0], [50.5, 16.0], [51.0, 15.0], [54.0, 14.1], [54.3, 14.3],
      ],
    ],
  },
  {
    id: 'UKR',
    name: 'Ukraine',
    continent: 'Europe',
    lat: 48.3,
    lon: 31.1,
    polygons: [
      [
        [52.0, 23.5], [52.0, 33.0], [50.0, 39.0], [47.0, 39.0], [45.0, 36.0],
        [45.0, 33.0], [46.0, 30.0], [48.0, 23.5], [52.0, 23.5],
      ],
    ],
  },
  {
    id: 'NOR',
    name: 'Norway',
    continent: 'Europe',
    lat: 60.4,
    lon: 8.4,
    polygons: [
      [
        [58.0, 7.0], [62.0, 5.0], [68.0, 14.0], [71.0, 26.0], [70.0, 31.0],
        [69.0, 29.0], [64.0, 14.0], [60.0, 12.0], [59.0, 10.0], [58.0, 7.0],
      ],
    ],
  },
  {
    id: 'SWE',
    name: 'Sweden',
    continent: 'Europe',
    lat: 60.1,
    lon: 18.6,
    polygons: [
      [
        [55.4, 13.0], [56.0, 16.0], [60.0, 19.0], [65.0, 23.0], [68.5, 22.0],
        [68.0, 20.0], [64.0, 14.0], [60.0, 12.0], [57.7, 12.0], [55.4, 13.0],
      ],
    ],
  },

  // --- ASIA ---
  {
    id: 'CHN',
    name: 'China',
    continent: 'Asia',
    lat: 35.8,
    lon: 104.1,
    polygons: [
      [
        [49.0, 87.0], [53.5, 122.0], [48.0, 135.0], [42.5, 130.0], [38.5, 120.0],
        [32.0, 121.5], [23.5, 117.0], [21.5, 108.5], [22.0, 100.0], [28.0, 97.0],
        [27.5, 88.5], [31.5, 79.0], [36.0, 74.0], [40.0, 74.0], [45.0, 80.0],
        [49.0, 87.0],
      ],
    ],
  },
  {
    id: 'IND',
    name: 'India',
    continent: 'Asia',
    lat: 20.5,
    lon: 78.9,
    polygons: [
      [
        [35.5, 74.5], [34.0, 78.0], [30.0, 81.0], [27.5, 88.5], [28.0, 97.0],
        [24.0, 93.0], [22.0, 89.0], [17.5, 83.0], [13.0, 80.0], [8.1, 77.5],
        [10.0, 75.5], [15.0, 73.5], [19.0, 72.8], [23.0, 68.5], [27.0, 71.0],
        [32.0, 75.0], [35.5, 74.5],
      ],
    ],
  },
  {
    id: 'JPN',
    name: 'Japan',
    continent: 'Asia',
    lat: 36.2,
    lon: 138.2,
    polygons: [
      // Honshu, Hokkaido, Kyushu
      [
        [45.5, 142.0], [43.0, 145.5], [41.5, 141.0], [38.0, 141.5], [35.0, 140.0],
        [33.5, 135.5], [31.0, 131.0], [33.5, 129.8], [36.0, 136.0], [40.0, 140.0],
        [45.5, 142.0],
      ],
    ],
  },
  {
    id: 'RUS',
    name: 'Russia',
    continent: 'Asia',
    lat: 61.5,
    lon: 105.3,
    polygons: [
      [
        [69.0, 31.0], [70.0, 60.0], [73.0, 80.0], [76.0, 110.0], [71.0, 150.0],
        [66.0, 170.0], [60.0, 165.0], [52.0, 142.0], [43.0, 132.0], [48.0, 135.0],
        [53.5, 122.0], [50.0, 90.0], [51.0, 55.0], [45.0, 48.0], [50.0, 39.0],
        [56.0, 32.0], [61.0, 33.0], [69.0, 31.0],
      ],
    ],
  },
  {
    id: 'KOR',
    name: 'South Korea',
    continent: 'Asia',
    lat: 35.9,
    lon: 127.7,
    polygons: [
      [
        [38.3, 127.0], [38.3, 128.5], [36.0, 129.5], [35.0, 129.0], [34.5, 126.5],
        [36.5, 126.3], [37.7, 126.5], [38.3, 127.0],
      ],
    ],
  },
  {
    id: 'IDN',
    name: 'Indonesia',
    continent: 'Asia',
    lat: -0.7,
    lon: 113.9,
    polygons: [
      // Sumatra
      [
        [5.5, 95.3], [3.0, 99.0], [-2.0, 104.0], [-5.5, 105.5], [-4.0, 102.0],
        [0.0, 98.0], [5.5, 95.3],
      ],
      // Java
      [
        [-6.0, 106.0], [-6.5, 110.0], [-7.5, 114.0], [-8.5, 114.0], [-7.5, 109.0],
        [-6.8, 105.5], [-6.0, 106.0],
      ],
      // Borneo (Kalimantan)
      [
        [4.0, 116.0], [1.0, 118.0], [-3.0, 116.5], [-3.5, 112.0], [-1.0, 109.5],
        [2.0, 110.0], [4.0, 116.0],
      ],
    ],
  },
  {
    id: 'SAU',
    name: 'Saudi Arabia',
    continent: 'Asia',
    lat: 23.8,
    lon: 45.0,
    polygons: [
      [
        [31.5, 38.0], [30.0, 48.0], [27.0, 50.0], [24.0, 51.5], [23.0, 55.0],
        [17.0, 53.0], [16.5, 43.0], [21.0, 39.0], [28.0, 35.0], [31.5, 38.0],
      ],
    ],
  },
  {
    id: 'TUR',
    name: 'Turkey',
    continent: 'Asia',
    lat: 38.9,
    lon: 35.2,
    polygons: [
      [
        [41.5, 28.0], [42.0, 35.0], [41.5, 41.5], [37.5, 44.0], [37.0, 38.0],
        [36.0, 36.0], [36.5, 30.0], [39.0, 26.5], [41.5, 28.0],
      ],
    ],
  },
  {
    id: 'THA',
    name: 'Thailand',
    continent: 'Asia',
    lat: 15.8,
    lon: 100.9,
    polygons: [
      [
        [20.4, 100.0], [18.0, 104.5], [15.0, 105.5], [12.0, 102.5], [6.5, 101.5],
        [7.0, 99.5], [13.0, 100.0], [16.5, 98.5], [20.4, 100.0],
      ],
    ],
  },
  {
    id: 'VNM',
    name: 'Vietnam',
    continent: 'Asia',
    lat: 14.0,
    lon: 108.2,
    polygons: [
      [
        [22.8, 105.5], [21.5, 108.0], [17.0, 107.0], [12.0, 109.2], [8.5, 105.0],
        [10.5, 105.0], [16.0, 107.5], [21.5, 104.0], [22.8, 105.5],
      ],
    ],
  },

  // --- AFRICA ---
  {
    id: 'EGY',
    name: 'Egypt',
    continent: 'Africa',
    lat: 26.8,
    lon: 30.8,
    polygons: [
      [
        [31.5, 25.0], [31.5, 32.0], [31.3, 34.2], [27.8, 34.3], [22.0, 37.0],
        [22.0, 25.0], [31.5, 25.0],
      ],
    ],
  },
  {
    id: 'ZAF',
    name: 'South Africa',
    continent: 'Africa',
    lat: -30.5,
    lon: 22.9,
    polygons: [
      [
        [-22.2, 29.9], [-26.8, 32.8], [-31.0, 30.0], [-34.0, 25.5], [-34.8, 20.0],
        [-31.0, 18.0], [-28.5, 16.5], [-26.0, 20.0], [-22.2, 29.9],
      ],
    ],
  },
  {
    id: 'NGA',
    name: 'Nigeria',
    continent: 'Africa',
    lat: 9.0,
    lon: 8.6,
    polygons: [
      [
        [13.8, 4.0], [13.8, 13.0], [11.0, 14.5], [5.0, 8.5], [4.5, 6.0],
        [6.3, 2.7], [10.0, 3.5], [13.8, 4.0],
      ],
    ],
  },
  {
    id: 'KEN',
    name: 'Kenya',
    continent: 'Africa',
    lat: -0.0,
    lon: 37.9,
    polygons: [
      [
        [4.5, 36.0], [4.0, 41.5], [-1.5, 41.5], [-4.7, 39.2], [-3.0, 37.5],
        [-1.0, 34.0], [3.5, 34.5], [4.5, 36.0],
      ],
    ],
  },
  {
    id: 'MAR',
    name: 'Morocco',
    continent: 'Africa',
    lat: 31.7,
    lon: -7.0,
    polygons: [
      [
        [35.8, -5.5], [35.0, -2.0], [32.0, -1.0], [28.0, -9.0], [28.0, -12.0],
        [32.0, -9.5], [35.8, -5.5],
      ],
    ],
  },
  {
    id: 'DZA',
    name: 'Algeria',
    continent: 'Africa',
    lat: 28.0,
    lon: 2.6,
    polygons: [
      [
        [37.0, 8.0], [33.0, 9.0], [24.0, 9.5], [19.0, 5.0], [24.0, -4.5],
        [30.0, -8.0], [35.0, -2.0], [37.0, 1.0], [37.0, 8.0],
      ],
    ],
  },

  // --- OCEANIA ---
  {
    id: 'AUS',
    name: 'Australia',
    continent: 'Oceania',
    lat: -25.2,
    lon: 133.7,
    polygons: [
      [
        [-12.0, 131.0], [-12.0, 136.0], [-17.0, 139.0], [-11.0, 142.0], [-22.0, 150.0],
        [-32.0, 152.0], [-38.0, 146.0], [-38.0, 140.0], [-35.0, 115.0], [-22.0, 114.0],
        [-15.0, 124.0], [-12.0, 131.0],
      ],
    ],
  },
  {
    id: 'NZL',
    name: 'New Zealand',
    continent: 'Oceania',
    lat: -40.9,
    lon: 174.8,
    polygons: [
      [
        [-34.5, 172.8], [-37.5, 178.5], [-41.5, 175.5], [-46.5, 169.0], [-45.5, 166.5],
        [-40.5, 172.5], [-38.0, 174.5], [-34.5, 172.8],
      ],
    ],
  },

  // --- ANTARCTICA ---
  {
    id: 'ATA',
    name: 'Antarctica',
    continent: 'Antarctica',
    lat: -82.8,
    lon: 135.0,
    polygons: [
      [
        [-65.0, -64.0], [-68.0, -40.0], [-72.0, 0.0], [-66.0, 60.0], [-66.0, 100.0],
        [-66.0, 140.0], [-71.0, 170.0], [-74.0, -170.0], [-72.0, -120.0], [-65.0, -64.0],
      ],
    ],
  },
];

export const WORLD_CITIES: WorldCity[] = [
  // --- North America ---
  { name: 'New York', country: 'United States', lat: 40.7128, lon: -74.006, tier: 1 },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lon: -118.2437, tier: 1 },
  { name: 'Chicago', country: 'United States', lat: 41.8781, lon: -87.6298, tier: 2 },
  { name: 'San Francisco', country: 'United States', lat: 37.7749, lon: -122.4194, tier: 1 },
  { name: 'Washington D.C.', country: 'United States', lat: 38.9072, lon: -77.0369, tier: 2, isCapital: true },
  { name: 'Miami', country: 'United States', lat: 25.7617, lon: -80.1918, tier: 2 },
  { name: 'Seattle', country: 'United States', lat: 47.6062, lon: -122.3321, tier: 2 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832, tier: 1 },
  { name: 'Vancouver', country: 'Canada', lat: 49.2827, lon: -123.1207, tier: 2 },
  { name: 'Montreal', country: 'Canada', lat: 45.5017, lon: -73.5673, tier: 2 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lon: -99.1332, tier: 1, isCapital: true },
  { name: 'Havana', country: 'Cuba', lat: 23.1136, lon: -82.3666, tier: 2, isCapital: true },

  // --- South America ---
  { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lon: -46.6333, tier: 1 },
  { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lon: -43.1729, tier: 2 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lon: -58.3816, tier: 1, isCapital: true },
  { name: 'Santiago', country: 'Chile', lat: -33.4489, lon: -70.6693, tier: 1, isCapital: true },
  { name: 'Bogotá', country: 'Colombia', lat: 4.711, lon: -74.0721, tier: 1, isCapital: true },
  { name: 'Lima', country: 'Peru', lat: -12.0464, lon: -77.0428, tier: 1, isCapital: true },
  { name: 'Caracas', country: 'Venezuela', lat: 10.4806, lon: -66.9036, tier: 2, isCapital: true },

  // --- Europe ---
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278, tier: 1, isCapital: true },
  { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, tier: 1, isCapital: true },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lon: 13.405, tier: 1, isCapital: true },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lon: -3.7038, tier: 1, isCapital: true },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964, tier: 1, isCapital: true },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041, tier: 2, isCapital: true },
  { name: 'Zurich', country: 'Switzerland', lat: 47.3769, lon: 8.5417, tier: 2 },
  { name: 'Athens', country: 'Greece', lat: 37.9838, lon: 23.7275, tier: 2, isCapital: true },
  { name: 'Stockholm', country: 'Sweden', lat: 59.3293, lon: 18.0686, tier: 2, isCapital: true },
  { name: 'Oslo', country: 'Norway', lat: 59.9139, lon: 10.7522, tier: 2, isCapital: true },
  { name: 'Warsaw', country: 'Poland', lat: 52.2297, lon: 21.0122, tier: 2, isCapital: true },
  { name: 'Kyiv', country: 'Ukraine', lat: 50.4501, lon: 30.5234, tier: 2, isCapital: true },
  { name: 'Moscow', country: 'Russia', lat: 55.7558, lon: 37.6173, tier: 1, isCapital: true },

  // --- Asia ---
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, tier: 1, isCapital: true },
  { name: 'Beijing', country: 'China', lat: 39.9042, lon: 116.4074, tier: 1, isCapital: true },
  { name: 'Shanghai', country: 'China', lat: 31.2304, lon: 121.4737, tier: 1 },
  { name: 'Hong Kong', country: 'China', lat: 22.3193, lon: 114.1694, tier: 2 },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lon: 126.978, tier: 1, isCapital: true },
  { name: 'New Delhi', country: 'India', lat: 28.6139, lon: 77.209, tier: 1, isCapital: true },
  { name: 'Mumbai', country: 'India', lat: 19.076, lon: 72.8777, tier: 1 },
  { name: 'Bengaluru', country: 'India', lat: 12.9716, lon: 77.5946, tier: 2 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198, tier: 1, isCapital: true },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lon: 100.5018, tier: 1, isCapital: true },
  { name: 'Hanoi', country: 'Vietnam', lat: 21.0285, lon: 105.8542, tier: 2, isCapital: true },
  { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lon: 106.8456, tier: 1, isCapital: true },
  { name: 'Manila', country: 'Philippines', lat: 14.5995, lon: 120.9842, tier: 2, isCapital: true },
  { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lon: 55.2708, tier: 1 },
  { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lon: 46.6753, tier: 2, isCapital: true },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lon: 28.9784, tier: 1 },

  // --- Africa ---
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357, tier: 1, isCapital: true },
  { name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lon: 28.0473, tier: 1 },
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lon: 18.4241, tier: 2 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lon: 3.3792, tier: 1 },
  { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lon: 36.8219, tier: 1, isCapital: true },
  { name: 'Casablanca', country: 'Morocco', lat: 33.5731, lon: -7.5898, tier: 2 },
  { name: 'Algiers', country: 'Algeria', lat: 36.7538, lon: 3.0588, tier: 2, isCapital: true },

  // --- Oceania ---
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093, tier: 1 },
  { name: 'Melbourne', country: 'Australia', lat: -37.8136, lon: 144.9631, tier: 1 },
  { name: 'Brisbane', country: 'Australia', lat: -27.4698, lon: 153.0251, tier: 2 },
  { name: 'Perth', country: 'Australia', lat: -31.9505, lon: 115.8605, tier: 2 },
  { name: 'Auckland', country: 'New Zealand', lat: -36.8485, lon: 174.7633, tier: 2 },
  { name: 'Wellington', country: 'New Zealand', lat: -41.2865, lon: 174.7762, tier: 3, isCapital: true },
];

/**
 * Point-in-polygon ray casting check in spherical degrees.
 */
export function isCoordInPolygon(
  lat: number,
  lon: number,
  poly: Array<[number, number]>
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i][0];
    const xi = poly[i][1];
    const yj = poly[j][0];
    const xj = poly[j][1];

    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi || 0.00001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Returns matching WorldCountry if coordinate falls inside any of its polygons,
 * or nearest country within proximity.
 */
export function findCountryForCoord(
  lat: number,
  lon: number
): WorldCountry | null {
  // 1. Direct polygon boundary containment
  for (const country of WORLD_COUNTRIES) {
    for (const poly of country.polygons) {
      if (isCoordInPolygon(lat, lon, poly)) {
        return country;
      }
    }
  }

  // 2. Proximity check to country center
  let closest: WorldCountry | null = null;
  let minDistance = Infinity;

  for (const country of WORLD_COUNTRIES) {
    const dLat = country.lat - lat;
    let dLon = country.lon - lon;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;
    const dist = Math.sqrt(dLat * dLat + dLon * dLon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = country;
    }
  }

  return minDistance < 18 ? closest : null;
}
