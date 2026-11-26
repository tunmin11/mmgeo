/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MyanmarMap } from '../map';
import { availableLevels } from '../boundaries';
import type { AnyPlace } from '../types';

const shape = (name: string) => screen.getByRole('button', { name });

test('renders every state as a named, focusable shape', () => {
  render(<MyanmarMap />);
  expect(screen.getByRole('group', { name: 'Map of Myanmar' })).toBeTruthy();
  const yangon = shape('Yangon Region');
  expect(yangon.getAttribute('tabindex')).toBe('0');
  expect(yangon.getAttribute('aria-pressed')).toBe('false');
  expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(14);
});

test('clicking a state selects it and reports the place', () => {
  const onChange = jest.fn();
  render(<MyanmarMap depth="state" onChange={onChange} />);
  fireEvent.click(shape('Yangon Region'));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ code: 'MMR013', level: 'state' }));
  expect(shape('Yangon Region').getAttribute('aria-pressed')).toBe('true');
});

test('keyboard: Enter and Space pick the focused shape', () => {
  const onChange = jest.fn();
  render(<MyanmarMap depth="state" onChange={onChange} />);
  fireEvent.keyDown(shape('Mon State'), { key: 'Enter' });
  fireEvent.keyDown(shape('Kachin State'), { key: ' ' });
  expect(onChange.mock.calls.map(c => (c[0] as AnyPlace).code)).toEqual(['MMR011', 'MMR001']);
});

test('hover and focus announce English and Burmese names', () => {
  render(<MyanmarMap />);
  fireEvent.mouseEnter(shape('Yangon Region'));
  expect(screen.getByText('ရန်ကုန်တိုင်းဒေသကြီး')).toBeTruthy();
  fireEvent.mouseLeave(shape('Yangon Region'));
  expect(screen.queryByText('ရန်ကုန်တိုင်းဒေသကြီး')).toBeNull();
});

test('Burmese labels and accessible names with lang="mm"', () => {
  render(<MyanmarMap lang="mm" />);
  expect(screen.getByRole('button', { name: 'ရန်ကုန်တိုင်းဒေသကြီး' })).toBeTruthy();
  expect(screen.getByRole('group', { name: 'မြန်မာနိုင်ငံ မြေပုံ' })).toBeTruthy();
});

test('controlled value follows an outside change', () => {
  function Harness() {
    const [v, setV] = useState<string | null>('MMR001');
    return (
      <>
        <button type="button" onClick={() => setV('MMR013')}>pick yangon</button>
        <MyanmarMap depth="state" value={v} onChange={p => setV(p?.code ?? null)} />
      </>
    );
  }
  render(<Harness />);
  expect(shape('Kachin State').getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByText('pick yangon'));
  expect(shape('Yangon Region').getAttribute('aria-pressed')).toBe('true');
  expect(shape('Kachin State').getAttribute('aria-pressed')).toBe('false');
});

const deeper = availableLevels.length > 1 ? test : test.skip;
deeper('drills into a state and back out with the breadcrumb', () => {
  render(<MyanmarMap />);
  fireEvent.click(shape('Yangon Region'));
  expect(screen.queryByRole('button', { name: 'Kachin State' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Myanmar' }));
  expect(shape('Kachin State')).toBeTruthy();
});

test('a value deeper than the outlines still highlights its ancestor on screen', () => {
  // With state outlines only, a township value keeps the country view and highlights its state.
  render(<MyanmarMap value="MMR013010" />);
  if (availableLevels.includes('township')) {
    expect(shape('Yankin').getAttribute('aria-pressed')).toBe('true');
  } else {
    expect(shape('Yangon Region').getAttribute('aria-pressed')).toBe('true');
    expect(shape('Kachin State').getAttribute('aria-pressed')).toBe('false');
  }
});
