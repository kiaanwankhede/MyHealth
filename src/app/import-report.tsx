import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { sehatPdf } from '../../modules/sehat-pdf';
import { toISODate } from '../lib/dates';
import { readReport, type Prefill, type TextLine } from '../lib/labImport';
import { testSpec } from '../lib/labs';
import { colors, radius } from '../theme';

/** Pages are rendered at 3× PDF resolution (~1800 px wide for A4): sharp enough for small table text. */
const RENDER_SCALE = 3;
const MAX_PAGES = 8;

export default function ImportReportScreen() {
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async () => {
    setError(null);
    try {
      const picked = await File.pickFileAsync({ mimeTypes: ['application/pdf', 'image/*'] });
      if (picked.canceled) return;
      const file = picked.result;
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name ?? file.uri);
      const native = sehatPdf();

      setStep('Opening the report…');
      const images = isPdf ? await native.renderPages(file.uri, RENDER_SCALE, MAX_PAGES) : [file.uri];
      const pages: TextLine[][] = [];
      for (let i = 0; i < images.length; i++) {
        setStep(images.length > 1 ? `Reading page ${i + 1} of ${images.length}…` : 'Reading the report…');
        pages.push(await native.recognizeText(images[i]));
      }

      const result = readReport(pages, new Date());
      if (result.found.length === 0) {
        setError(
          'No lab values found in this file. If it is a photo, try a sharper, straight one in good light, or type the values in.',
        );
        return;
      }
      const prefill: Prefill = {
        date: result.date ? toISODate(result.date) : null,
        lab: result.lab,
        values: result.values,
        notes: result.found.filter((f) => f.note).map((f) => `${testSpec(f.key).name}: ${f.note}`),
      };
      router.replace({ pathname: '/lab-report', params: { prefill: JSON.stringify(prefill) } });
    } catch (e) {
      setError(e instanceof Error ? `Could not read this file: ${e.message}` : 'Could not read this file.');
    } finally {
      setStep(null);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.body}>
        Choose your lab report as a PDF (as the lab sent it) or a photo. Sehat reads it on this phone, nothing
        is uploaded, and fills in the values it finds for you to check before saving.
      </Text>
      <Text style={styles.note}>
        Works best with PDFs from Thyrocare, Dr Lal PathLabs, SRL/Agilus, Metropolis, Healthians, Apollo and
        similar labs. For a photo, lay the page flat in good light and keep it straight.
      </Text>
      <Pressable
        style={[styles.button, step !== null && styles.disabled]}
        onPress={choose}
        disabled={step !== null}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Choose PDF or photo</Text>
      </Pressable>
      {step && (
        <>
          <ActivityIndicator color={colors.teal} />
          <Text style={styles.note}>{step}</Text>
        </>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable onPress={() => router.replace('/lab-report')} accessibilityRole="button">
        <Text style={styles.link}>Type values in instead</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 14 },
  body: { fontSize: 16, lineHeight: 23, color: colors.ink },
  note: { fontSize: 14, lineHeight: 20, color: colors.muted },
  button: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabled: { opacity: 0.4 },
  buttonText: { color: colors.surface, fontSize: 17, fontWeight: '600' },
  error: { fontSize: 15, lineHeight: 21, color: colors.orangeDark },
  link: { fontSize: 15, fontWeight: '600', color: colors.teal, textAlign: 'center', paddingVertical: 8 },
});
