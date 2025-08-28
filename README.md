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
import { initialize, getStates } from '@tm11/mmgeo';

// Initialize with English language (default)
initialize({ language: 'en' });

// Get all states
const states = getStates();
console.log(states[0].en); // "Kachin State"

// Switch to Myanmar language
initialize({ language: 'mm' });
console.log(states[0].mm); // Myanmar name
```

## Data Structure

### State Object
```typescript
interface State {
  en: string;      // English name
  mm: string;      // Myanmar name
  lat: number;     // Latitude
  lng: number;     // Longitude
  capital: string; // Capital city
  districts: District[];
}

interface District {
  en: string;      // English name
  mm: string;      // Myanmar name
  townships: Township[];
}

interface Township {
  en: string;      // English name
  mm: string;      // Myanmar name
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
import { initialize, getStates } from '@tm11/mmgeo';

// Initialize in English
initialize({ language: 'en' });

// Get all states
const states = getStates();
console.log(states[0].en); // "Kachin State"
```

### Language Switching
```typescript
import { initialize, getStates } from '@tm11/mmgeo';

// Start with English
initialize({ language: 'en' });
const statesEn = getStates();
console.log(statesEn[0].en); // "Kachin State"

// Switch to Myanmar
initialize({ language: 'mm' });
const statesMm = getStates();
console.log(statesMm[0].mm); // Myanmar name
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This package is licensed under the ISC License. See the [LICENSE](LICENSE) file for more information.