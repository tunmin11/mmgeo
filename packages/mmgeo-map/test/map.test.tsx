/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MyanmarMap } from '../src';
import { availableLevels } from '@tm11/mmgeo/boundaries';
import type { AnyPlace } from '@tm11/mmgeo';
import type { MapPlace } from '@tm11/mmgeo/boundaries';

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

const deeper = availableLevels.includes('district') ? test : test.skip;
deeper('drills into a state and back out with the breadcrumb', () => {
  render(<MyanmarMap />);
  fireEvent.click(shape('Yangon Region'));
  expect(screen.queryByRole('button', { name: 'Kachin State' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Myanmar' }));
  expect(shape('Kachin State')).toBeTruthy();
});

const full = availableLevels.includes('ward') ? test : test.skip;
full('clicks all the way down: state → district → township → town → ward', async () => {
  const onChange = jest.fn();
  render(<MyanmarMap onChange={onChange} />);
  fireEvent.click(shape('Yangon Region'));
  fireEvent.click(shape('Yangon (East)'));
  fireEvent.click(await screen.findByRole('button', { name: 'Yankin' }));       // township, loads its file
  expect(screen.getByRole('status').textContent).toBe('Loading…');
  fireEvent.click(await screen.findByRole('button', { name: 'Yankin', pressed: false })); // the town inside
  fireEvent.click(await screen.findByRole('button', { name: 'No (1) Ward' }));
  expect(onChange.mock.calls.map(c => (c[0] as MapPlace).level)).toEqual(['state', 'district', 'township', 'town', 'ward']);
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ code: 'MMR013010701501', townCode: 'MMR013010701', townshipCode: 'MMR013010' }));
  // Breadcrumb: Myanmar › Yangon Region › Yangon (East) › Yankin › Yankin
  expect(screen.getAllByRole('navigation')[0].textContent).toContain('Yangon (East)');
  fireEvent.keyDown(shape('No (1) Ward'), { key: 'Escape' });
  expect(await screen.findByRole('button', { name: 'Yankin', pressed: true })).toBeTruthy(); // back on the town
});

test('a deep value opens the map where it can be seen and highlights it', async () => {
  render(<MyanmarMap value="MMR013010" />);
  if (availableLevels.includes('township')) {
    expect((await screen.findByRole('button', { name: 'Yankin' })).getAttribute('aria-pressed')).toBe('true');
  } else {
    expect(shape('Yangon Region').getAttribute('aria-pressed')).toBe('true');
    expect(shape('Kachin State').getAttribute('aria-pressed')).toBe('false');
  }
});

test('depth="state" never loads finer outlines', () => {
  render(<MyanmarMap depth="state" value="MMR013010" />);
  expect(shape('Yangon Region').getAttribute('aria-pressed')).toBe('true');
  expect(screen.queryByRole('status')).toBeNull();
});

test('root starts inside one area and the breadcrumb cannot leave it', async () => {
  const onChange = jest.fn();
  render(<MyanmarMap root="MMR222" onChange={onChange} />);
  expect(screen.queryByRole('button', { name: 'Myanmar' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Kachin State' })).toBeNull();
  const shapes = screen.getAllByRole('button');
  expect(shapes.length).toBeGreaterThan(0);
  fireEvent.keyDown(shapes[0], { key: 'Escape' });
  expect(screen.queryByRole('button', { name: 'Kachin State' })).toBeNull();
  if (!availableLevels.includes('district')) {
    // Only state outlines: Shan itself is the one shape to pick.
    fireEvent.click(shape('Shan State'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ code: 'MMR222' }));
  }
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull()); // finer outlines finish loading
});

test('context="hidden" draws no neighbours, "faint" does once zoomed in', () => {
  const { container, unmount } = render(<MyanmarMap root="MMR222" context="faint" />);
  expect(container.querySelectorAll('g[aria-hidden="true"] path').length).toBeGreaterThan(0);
  unmount();
  const hidden = render(<MyanmarMap root="MMR222" />); // root defaults to hidden
  expect(hidden.container.querySelectorAll('g[aria-hidden="true"] path').length).toBe(0);
});

test('labels are off by default; showLabels draws them', () => {
  expect(render(<MyanmarMap depth="state" />).container.querySelectorAll('text').length).toBe(0);
  expect(render(<MyanmarMap depth="state" showLabels />).container.querySelectorAll('text').length).toBeGreaterThan(0);
});

test('hover shows a coloured popover that follows the pointer', () => {
  render(<MyanmarMap depth="state" colors={{ tooltip: '#123456' }} />);
  fireEvent.mouseEnter(shape('Yangon Region'), { clientX: 40, clientY: 60 });
  const tip = screen.getByText('Yangon Region').parentElement!;
  expect(tip.style.background).toBe('rgb(18, 52, 86)');
  expect([tip.style.left, tip.style.top]).toEqual(['40px', '60px']);
  fireEvent.mouseLeave(shape('Yangon Region'));
  expect(screen.queryByText('Yangon Region')).toBeNull();
});
