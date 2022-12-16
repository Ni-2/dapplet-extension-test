import { qase } from 'cypress-qase-reporter/dist/mocha'

describe('dapplets action test', () => {
  qase(
    2,
    it('dapplets action test', () => {
      // it('opens context webpage', () => {
      cy.visit('https://example.com')
      // })

      // it('injects overlay', () => {
      cy.get('dapplets-overlay-manager')
      // })

      // it('shows minimized overlay', () => {
      cy.window().then((win) => win.dapplets.openPopup())
      cy.get('dapplets-overlay-manager').should('not.have.class', 'dapplets-overlay-hidden')
      // })

      //   check main menu actions
      cy.get('dapplets-overlay-manager')
        .getByTestId('tab-pinned', { includeShadowDom: true })
        .first()
        .click()

      cy.get('dapplets-overlay-manager')
        .getByTestId('main-menu-actions', { includeShadowDom: true })
        .should('exist')
    })
  )
})
