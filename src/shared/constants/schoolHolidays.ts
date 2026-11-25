/**
 * Days without lessons that the calendar wizard marks as "Feriado", per country.
 *
 * Brazil mirrors the backend's BrazilSchoolCalendar (chalkboard): the national holidays, Carnaval (Monday and
 * Tuesday), Sexta-feira Santa, Corpus Christi and the usual July recess (15-31). Keep both lists in step: the
 * wizard sends its HOLIDAY dates to the backend, and a date it marks as a lesson or an exercise is created as one.
 */
import type { CountryCode } from "@/lib/curriculum/countryCatalog";
import { easterSunday, getPortugueseHolidays } from "@/shared/constants/portugueseHolidays";

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Brazilian national holidays and school breaks from `fromYear` through `toYear` (inclusive). */
export function getBrazilianSchoolHolidays(fromYear: number, toYear: number): Set<string> {
  const dates = new Set<string>();
  for (let y = fromYear; y <= toYear; y++) {
    dates.add(`${y}-01-01`); // Confraternização Universal
    dates.add(`${y}-04-21`); // Tiradentes
    dates.add(`${y}-05-01`); // Dia do Trabalho
    dates.add(`${y}-09-07`); // Independência do Brasil
    dates.add(`${y}-10-12`); // Nossa Senhora Aparecida
    dates.add(`${y}-11-02`); // Finados
    dates.add(`${y}-11-15`); // Proclamação da República
    dates.add(`${y}-11-20`); // Dia Nacional de Zumbi e da Consciência Negra
    dates.add(`${y}-12-25`); // Natal

    const easter = easterSunday(y);
    dates.add(iso(addDays(easter, -48))); // Carnaval (segunda-feira)
    dates.add(iso(addDays(easter, -47))); // Carnaval (terça-feira)
    dates.add(iso(addDays(easter, -2))); // Sexta-feira Santa
    dates.add(iso(addDays(easter, 60))); // Corpus Christi

    for (let day = 15; day <= 31; day++) dates.add(`${y}-07-${day}`); // Recesso escolar de julho
  }
  return dates;
}

/** The holidays the wizard marks for a teacher in `country`: Brazil's, else Portugal's (as before). */
export function getSchoolHolidays(country: CountryCode | undefined, fromYear: number, toYear: number): Set<string> {
  return country === "BR" ? getBrazilianSchoolHolidays(fromYear, toYear) : getPortugueseHolidays(fromYear, toYear);
}
