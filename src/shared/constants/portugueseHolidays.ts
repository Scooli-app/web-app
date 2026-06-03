/**
 * Portuguese national public holidays.
 * Returns ISO date strings (YYYY-MM-DD) for all statutory holidays
 * that fall within the given year range (inclusive).
 */

/** Compute Easter Sunday for a given year using the Anonymous Gregorian algorithm. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-based
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Returns the set of Portuguese national holiday ISO dates covering years
 * `fromYear` through `toYear` (inclusive).
 */
export function getPortugueseHolidays(fromYear: number, toYear: number): Set<string> {
  const dates = new Set<string>();

  for (let y = fromYear; y <= toYear; y++) {
    const easter = easterSunday(y);

    // Fixed national holidays
    dates.add(`${y}-01-01`); // Ano Novo
    dates.add(`${y}-04-25`); // Dia da Liberdade
    dates.add(`${y}-05-01`); // Dia do Trabalhador
    dates.add(`${y}-06-10`); // Dia de Portugal
    dates.add(`${y}-08-15`); // Assunção de Nossa Senhora
    dates.add(`${y}-10-05`); // Implantação da República
    dates.add(`${y}-11-01`); // Dia de Todos os Santos
    dates.add(`${y}-12-01`); // Restauração da Independência
    dates.add(`${y}-12-08`); // Imaculada Conceição
    dates.add(`${y}-12-25`); // Natal

    // Moveable holidays (relative to Easter)
    dates.add(iso(addDays(easter, -47))); // Carnaval (Terça-feira)
    dates.add(iso(addDays(easter, -2)));  // Sexta-feira Santa
    dates.add(iso(addDays(easter, 60)));  // Corpo de Deus
  }

  return dates;
}
