import cn from 'classnames'
import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'
import styles from './Checkbox.module.scss'

export interface CheckboxProps
  extends DetailedHTMLProps<HTMLAttributes<HTMLInputElement>, HTMLInputElement> {
  title: string
  isCheckbox?: boolean
  isSupport?: boolean
  onChange?: (x) => void
  isReadonly?: boolean
}
export const Checkbox: FC<CheckboxProps> = (props: CheckboxProps) => {
  const { title, isSupport = false, isCheckbox, onChange, isReadonly, ...anotherProps } = props

  return (
    <div className={styles.supportBlock}>
      <div
        data-title="The centralized storage maintained by Dapplets Project. It backs up your modules in case decentralized storages become unavailable."
        className={cn(styles.checkboxBlock, { [styles.support]: isSupport })}
      >
        <label className={cn(styles.wrapper)}>
          <input
            className={cn(styles.input)}
            type="checkbox"
            onChange={onChange}
            checked={isCheckbox}
            readOnly={isReadonly}
            {...anotherProps}
          />
          <span
            className={cn(styles.inputCheckbox, {
              [styles.active]: isCheckbox,
            })}
          />
        </label>
        <span className={cn(styles.inputCheckboxTitle)}>{title}</span>
      </div>
    </div>
  )
}
