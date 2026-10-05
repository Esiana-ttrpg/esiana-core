import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErasView } from '../src/components/chronology/ErasView';
import { fetchEras } from '../src/lib/chronologyErasApi';

function Fixture() {
  const [fixture, setFixture] = useState<any>();
  const [eras, setEras] = useState<any[]>([]);
  async function refresh(handle: string) { setEras((await fetchEras(handle)).eras); }
  useEffect(() => { void fetch('/fixture').then(r => r.json()).then(async data => { await refresh(data.campaignHandle); setFixture(data); }); }, []);
  if (!fixture) return <p>Loading…</p>;
  const observer = document.cookie.includes('eraRole=OBSERVER');
  return <ErasView campaignHandle={fixture.campaignHandle} eras={eras} onErasChanged={() => refresh(fixture.campaignHandle)} calendars={[fixture.calendar]} timeBundle={{ calendars: [fixture.calendar] } as any} categories={[]} events={[]} baseEvents={[]} canManage={!observer} selectedEventId={null} onSelectEvent={() => {}} />;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><Fixture /></BrowserRouter>);
