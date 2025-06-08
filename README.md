# @tm11/mmgeo

**@tm11/mmgeo** is a lightweight and comprehensive NPM package that provides geographic data for Myanmar, including states, districts, and townships. The data is available in both English and Myanmar languages, making it perfect for localization purposes in Myanmar-based applications.

## Features

- Complete geographic data for Myanmar (states, districts, and townships)
- Bilingual support (English and Myanmar languages)
- TypeScript support with full type definitions
- Simple and intuitive API
- Lightweight package with minimal dependencies
- Easy language switching functionality

## Installation

You can install this package using NPM:

```bash
npm install @tm11/mmgeo
```

Or with Yarn:

```bash
yarn add @tm11/mmgeo
```

[![NPM Version](https://img.shields.io/npm/v/@tm11/mmgeo.svg)](https://www.npmjs.com/package/@tm11/mmgeo) [![NPM Downloads](https://img.shields.io/npm/dt/@tm11/mmgeo.svg)](https://www.npmjs.com/package/@tm11/mmgeo)

## Quick Start

```typescript
import { initialize, getStates, getDistricts, getTownships } from '@tm11/mmgeo';

// Initialize with English language (default)
initialize({ language: 'en' });

// Get all states
const states = getStates();
console.log(states);

// Switch to Myanmar language
initialize({ language: 'mm' });

// Get districts for a specific state
const districts = getDistricts('Yangon');
console.log(districts);
```

## Data Structure

### State Object
```typescript
interface State {
  eng: string;      // English name
  mm: string;       // Myanmar name
  lat: number;      // Latitude
  lng: number;      // Longitude
  capital: string;  // Capital city
  districts: District[]; // Array of districts
}
```

### District Object
```typescript
interface District {
  eng: string;      // English name
  mm: string;       // Myanmar name
  townships: Township[]; // Array of townships
}
```

### Township Object
```typescript
interface Township {
  eng: string;      // English name
  mm: string;       // Myanmar name
}
```

## API Reference

### Configuration

#### `initialize(options: ConfigOptions)`
Initialize the package with configuration options.

```typescript
interface ConfigOptions {
  language: 'en' | 'mm';  // Language setting
}
```

Example:
```typescript
import { initialize } from '@tm11/mmgeo';

// Set language to Myanmar
initialize({ language: 'mm' });
```

### Data Retrieval

#### `getStates(): State[]`
Returns an array of all states in Myanmar.

#### `getDistricts(stateName: string): District[]`
Returns districts for a specific state.

#### `getTownships(districtName: string): Township[]`
Returns townships for a specific district.

## Examples

### Basic Usage
```typescript
import { initialize, getStates, getDistricts } from '@tm11/mmgeo';

// Initialize in English
initialize({ language: 'en' });

// Get all states
const states = getStates();
console.log(states[0].eng); // "Kachin State"

// Get districts of Yangon
const yangonDistricts = getDistricts('Yangon');
console.log(yangonDistricts[0].eng); // "East Yangon"
```

### Language Switching
```typescript
import { initialize, getStates } from '@tm11/mmgeo';

// Start with English
initialize({ language: 'en' });
const statesEn = getStates();
console.log(statesEn[0].eng); // "Kachin State"

// Switch to Myanmar
initialize({ language: 'mm' });
const statesMm = getStates();
console.log(statesMm[0].mm); // "ကချင်ပြည်နယ်"
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This package is licensed under the ISC License. See the [LICENSE](LICENSE) file for more information.