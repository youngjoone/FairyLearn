describe('Funnel Flow', () => {
  beforeEach(() => {
    cy.visit('http://localhost:5173');
  });

  it('should navigate through the test funnel and show share button', () => {
    // Navigate to tests list
    cy.contains('테스트 목록 보기').click();
    cy.url().should('include', '/tests');

    // Click the first test card
    cy.get('.test-card').first().click();
    cy.url().should('include', '/test');

    // Answer 2-3 questions and submit
    // Assuming questions are simple radio buttons or inputs
    cy.get('.question-container').each(($el, index) => {
      if (index < 3) { // Answer first 3 questions
        cy.wrap($el).find('input[type="radio"]').first().check();
      }
    });

    cy.contains('제출').click();

    // Should be on the result page
    cy.url().should('include', '/result');

    // Check for share button
    cy.contains('공유하기').should('be.visible');
  });
});