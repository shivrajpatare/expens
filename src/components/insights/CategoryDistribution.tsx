import React from 'react';
import { motion } from 'motion/react';
import type { CategoryDistributionItem } from '../../domain/money/types';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';

interface CategoryDistributionProps {
  items: CategoryDistributionItem[];
  currencySymbol: string;
}

export const CategoryDistribution: React.FC<CategoryDistributionProps> = ({
  items,
  currencySymbol
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (items.length === 0) return null;

  return (
    <div className="category-distribution-card" aria-label="Category spending distribution">
      <div className="category-distribution-header">
        <h4 className="category-distribution-title">Where your money went</h4>
        <span className="category-distribution-count">
          {items.length} {items.length === 1 ? 'category' : 'categories'}
        </span>
      </div>

      <div className="category-rows-container">
        {items.map((item) => (
          <div key={item.category} className="category-row-item">
            <div className="category-row-meta">
              <div className="category-name-group">
                <span className="category-name">{item.category}</span>
                <span className="category-expense-count">
                  ({item.count} {item.count === 1 ? 'expense' : 'expenses'})
                </span>
              </div>

              <div className="category-amount-group">
                <span className="category-amount tabular-nums">
                  {currencySymbol}{item.amount.toFixed(2)}
                </span>
                <span className="category-percentage tabular-nums">
                  {item.percentage}%
                </span>
              </div>
            </div>

            {/* Proportional Bar (Distribution, not limit progress) */}
            <div className="category-bar-track">
              <motion.div
                className="category-bar-fill"
                initial={false}
                animate={{ width: `${item.percentage}%` }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : {
                        duration: motionTokens.durations.number,
                        ease: motionTokens.easings.number
                      }
                }
                role="progressbar"
                aria-valuenow={item.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.category}: ${item.percentage}%`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
