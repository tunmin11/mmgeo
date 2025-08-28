import { configure, Language } from './config';

export const initialize = (config: { language?: Language }) => {
  configure(config);
};
