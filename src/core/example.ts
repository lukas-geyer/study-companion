// A ready-made example plan (medicine, Graz style) with dates relative to today, so it always looks alive.
import { dnOf, dowOf, isoOf, weekKey, yearOf } from './dates';
import { makeExam, newAppData } from './defaults';
import type { AppData, DoneItem, Exam, Lang, Region } from './types';

/** Move n forward to the next Tuesday–Thursday (exams rarely fall on a Monday or Friday). */
const midweek = (n: number) => {
  while (![2, 3, 4].includes(dowOf(n))) n++;
  return n;
};

export function exampleData(lang: Lang, region: Region, T: number): AppData {
  const de = lang === 'de';
  const d = newAppData(region === 'none' ? 'AT' : region);
  const st = d.settings;
  st.termName = de ? 'Medizin · Beispielplan' : 'Medicine · example plan';
  const lect = de ? 'Vorlesung' : 'Lecture';
  const lab = de ? 'Präparierkurs' : 'Dissection lab';
  st.template = {
    '0': [],
    '1': [{ from: '08:15', to: '12:00', title: lect }],
    '2': [{ from: '08:15', to: '12:00', title: lect }, { from: '13:15', to: '17:00', title: lab }],
    '3': [{ from: '08:15', to: '12:00', title: lect }],
    '4': [{ from: '08:15', to: '12:00', title: lect }, { from: '13:15', to: '17:00', title: lab }],
    '5': [{ from: '08:15', to: '11:00', title: lect }],
    '6': [],
  };
  st.dayStart = '07:30';
  st.dayEnd = '21:30';
  st.cards = { on: true, reviewBase: 20, generalName: de ? 'Allgemeiner Stapel' : 'General deck', generalNew: 10, throttle: true, override: 0 };
  const y = yearOf(T) + (new Date(T * 864e5).getUTCMonth() >= 7 ? 0 : -1);
  st.breaks = [
    { label: de ? 'Weihnachtsferien' : 'Christmas break', from: isoOf(dnOf(y, 11, 24)), to: isoOf(dnOf(y + 1, 0, 6)) },
    { label: de ? 'Semesterferien' : 'Semester break', from: isoOf(dnOf(y + 1, 1, 4)), to: isoOf(dnOf(y + 1, 1, 28)) },
  ];
  st.startDate = isoOf(T - 10);
  st.courses = { [lab]: { name: '', exam: '', busy: true } };

  const exams: Exam[] = [];
  const add = (init: Partial<Exam>) => exams.push(makeExam(exams, init));
  add({ id: 'ex-pm4', name: de ? 'Bewegungsapparat' : 'Musculoskeletal system', short: 'PM IV', date: isoOf(midweek(T + 49)), size: 'L', hours: 60, weeks: 8, cards: 1200 });
  add({ id: 'ex-pm5', name: de ? 'Nervensystem' : 'Nervous system', short: 'PM V', date: isoOf(midweek(T + 98)), size: 'L', hours: 60, weeks: 8 });
  add({ id: 'ex-histo', name: de ? 'Histologie' : 'Histology', short: 'HISTO', date: isoOf(midweek(T + 133)), size: 'M', hours: 40, weeks: 5 });
  add({ id: 'ex-bioch', name: de ? 'Biochemie' : 'Biochemistry', short: 'BIOCH', date: '', size: 'M', hours: 40, weeks: 5 });
  d.exams = exams;
  st.courses[lab].exam = 'ex-pm4';

  // A few ticked days so progress and the streak are visible.
  for (let k = 1; k <= 4; k++) {
    const n = T - k;
    const iso = isoOf(n);
    const wk = weekKey(n);
    const doc = (d.done[wk] = d.done[wk] || { items: {} });
    const add2 = (id: string, it: DoneItem) => (doc.items[`${iso}_${id}`] = it);
    add2('rev_x_0', { d: iso, t: 'rev', min: 35, s: 7 * 60 + 30, e: 8 * 60 + 5, at: Date.now() });
    if (dowOf(n) !== 0) add2('deep_ex-pm4_0', { d: iso, t: 'deep', x: 'ex-pm4', min: 90, s: 17 * 60 + 30, e: 19 * 60, at: Date.now() });
  }
  d.meta = { onboarded: true, createdAt: Date.now() - 10 * 864e5, example: true };
  return d;
}
