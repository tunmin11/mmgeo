import { initialize } from '../hook';
import { getStates } from '../index';

test('Get all states in English by default', () => {
  const states = getStates();
  expect(states[0].getName()).toBe('Magway Region');
});

test('Set language to Myanmar and get states', () => {
  initialize({ language: 'mm' });
  const states = getStates();
  expect(states[0].getName()).toBe('မကွေးတိုင်းဒေသကြီး');
});
