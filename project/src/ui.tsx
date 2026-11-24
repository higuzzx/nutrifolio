import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  TextProps,
} from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { Utensils } from 'lucide-react-native';
export const orange = '#FF6B00',
  muted = '#96938D';
export const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR');
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size * 1.18}
      viewBox="0 0 48 56"
      accessibilityLabel="Nutrifolio"
    >
      <Path
        fill={orange}
        d="M7 55V23h10v4c4-5 9-6 14-5 9 1 13 7 13 17v16H33V39c0-7-2-9-7-9s-8 3-8 9v16zM24 18C11 18 8 10 8 3c11-1 19 4 16 15zM27 18C26 8 32 4 42 5c0 9-5 14-15 13z"
      />
    </Svg>
  );
}
export function Txt({ children, style, ...props }: TextProps) {
  return (
    <Text {...props} style={[s.text, style]}>
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Txt
        style={{
          color: secondary ? '#F8F7F3' : '#100A04',
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {title}
      </Txt>
    </Pressable>
  );
}
export function IconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={s.iconButton}
    >
      {children}
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  numeric = false,
  multiline = false,
  placeholder,
  secure = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
  multiline?: boolean;
  placeholder?: string;
  secure?: boolean;
}) {
  return (
    <View style={{ gap: 7, marginBottom: 15 }}>
      <Txt style={s.small}>{label}</Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        autoCapitalize="none"
        multiline={multiline}
        secureTextEntry={secure}
        autoCorrect={!secure}
        placeholder={placeholder}
        placeholderTextColor={muted}
        style={[
          s.input,
          multiline && { minHeight: 84, textAlignVertical: 'top' },
        ]}
      />
    </View>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
export function Heading({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={[s.row, { marginBottom: 16 }]}>
      <Txt style={[s.heading, { flex: 1 }]}>{title}</Txt>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ paddingVertical: 10 }}
        >
          <Txt style={s.accent}>{action}</Txt>
        </Pressable>
      )}
    </View>
  );
}
export function Empty({ title, copy }: { title: string; copy: string }) {
  return (
    <View style={s.empty}>
      <Utensils color={orange} size={28} />
      <Txt style={{ fontWeight: '600', marginTop: 12 }}>{title}</Txt>
      <Txt
        style={[s.small, { textAlign: 'center', marginTop: 6, lineHeight: 21 }]}
      >
        {copy}
      </Txt>
    </View>
  );
}
export function Ring({ value, goal }: { value: number; goal: number }) {
  const c = 2 * Math.PI * 61;
  return (
    <View style={{ width: 138, height: 138 }}>
      <Svg width={138} height={138}>
        <Circle
          cx={69}
          cy={69}
          r={61}
          stroke="#303030"
          strokeWidth={10}
          fill="none"
        />
        <Circle
          cx={69}
          cy={69}
          r={61}
          stroke={orange}
          strokeWidth={10}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - Math.min(value / goal, 1))}
          rotation={-90}
          origin="69,69"
          strokeLinecap="round"
        />
      </Svg>
      <View style={s.ringText}>
        <Txt style={{ fontSize: 25, fontWeight: '700' }}>
          {fmt(Math.abs(Math.round(goal) - Math.round(value)))}
        </Txt>
        <Txt style={{ fontSize: 10, color: muted }}>
          {value > goal ? 'kcal acima da meta' : 'kcal restantes'}
        </Txt>
      </View>
    </View>
  );
}
export function Chart({
  values,
  color = orange,
}: {
  values: number[];
  color?: string;
}) {
  if (!values.length)
    return <Txt style={s.small}>Os registros aparecerão aqui.</Txt>;
  const min = Math.min(...values),
    max = Math.max(...values),
    span = Math.max(max - min, 1);
  return (
    <View>
      <Svg width="100%" height={130} viewBox="0 0 320 130">
        <Polyline
          points={values
            .map(
              (v, i) =>
                `${values.length === 1 ? 160 : 10 + (i * 300) / (values.length - 1)},${110 - ((v - min) / span) * 90}`,
            )
            .join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={3}
        />
        {values.map((v, i) => (
          <Circle
            key={i}
            cx={
              values.length === 1 ? 160 : 10 + (i * 300) / (values.length - 1)
            }
            cy={110 - ((v - min) / span) * 90}
            r={4}
            fill="#111"
            stroke={color}
            strokeWidth={2}
          />
        ))}
      </Svg>
      <View style={s.row}>
        <Txt style={s.small}>Mín. {Math.round(min * 10) / 10}</Txt>
        <Txt style={s.small}>Máx. {Math.round(max * 10) / 10}</Txt>
      </View>
    </View>
  );
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080808', alignItems: 'center' },
  shell: { flex: 1, width: '100%', maxWidth: 520, backgroundColor: '#080808' },
  text: { color: '#F8F7F3', fontSize: 15 },
  small: { fontSize: 13, color: muted },
  accent: { color: orange, fontSize: 13 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.7 },
  heading: { fontSize: 18, fontWeight: '600' },
  stat: { fontSize: 27, fontWeight: '700', letterSpacing: -0.6 },
  header: {
    height: 76,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: { padding: 22, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    padding: 20,
    backgroundColor: '#111',
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#292929',
    marginBottom: 24,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: orange,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 14,
    minHeight: 50,
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#333',
  },
  input: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 12,
    padding: 14,
    color: '#F8F7F3',
    fontSize: 15,
    minHeight: 48,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#171717',
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#292929',
  },
  list: {
    borderRadius: 20,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#292929',
    overflow: 'hidden',
    marginBottom: 22,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
    minHeight: 64,
  },
  foodIcon: {
    width: 42,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#2A1B12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 28 },
  ringText: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    height: 5,
    backgroundColor: '#303030',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 5,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3B2819',
    backgroundColor: '#19130E',
    marginBottom: 22,
  },
  nav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#292929',
    backgroundColor: '#101010',
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 3,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#161616',
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#2B1A0E',
    borderBottomWidth: 2,
    borderColor: orange,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#F9EEE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#FF9A8E',
    lineHeight: 22,
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#2E1717',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#25251F',
    borderWidth: 1,
    borderColor: '#4C4C3A',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
