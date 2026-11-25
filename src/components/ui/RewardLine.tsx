import { cx, fmtCompact } from '@/lib/format'
import type { Reward } from '@/types'
import { Amount } from './bits'

/** En belønning som valutaikoner og beløp. Forventer ferdig utregnede beløp (se resolveReward). */
export function RewardLine({ reward, className, approx = false }: { reward: Reward; className?: string; approx?: boolean }) {
  const pre = approx ? '≈ ' : ''
  return (
    <span className={cx('inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]', className)}>
      {reward.budget ? (
        <Amount kind="budget">
          {pre}
          {fmtCompact(reward.budget)} kr
        </Amount>
      ) : null}
      {reward.fagpoeng ? (
        <Amount kind="fagpoeng">
          {pre}
          {fmtCompact(reward.fagpoeng)}
        </Amount>
      ) : null}
      {reward.kaffekopper ? <Amount kind="kaffekopper">{reward.kaffekopper}</Amount> : null}
    </span>
  )
}
