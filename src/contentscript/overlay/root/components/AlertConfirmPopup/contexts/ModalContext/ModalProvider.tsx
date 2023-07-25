import React, { JSX, useState } from 'react'

import { TAlertAndConfirmPayload } from '../../../../../../../common/types'
import { ModalContext, ModalContextState, ModalProps } from './ModalContext'

export const ModalProvider = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
  const [modals, setModals] = useState<ModalProps[]>([])

  async function confirm(payload: TAlertAndConfirmPayload): Promise<boolean> {
    return new Promise((resolve) => {
      const id = Math.random().toString(16).slice(2)
      setModals((prevModals) => [
        ...prevModals,
        {
          ...payload,
          id,
          onResolve: (value: boolean) => {
            setModals((prevModals) => prevModals.filter((modal) => modal.id !== id))
            resolve(value)
          },
        },
      ])
    })
  }

  const state: ModalContextState = {
    modals,
    confirm,
  }

  return <ModalContext.Provider value={state}>{children}</ModalContext.Provider>
}
