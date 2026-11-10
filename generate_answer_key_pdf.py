"""
Generates an authentic student handwritten examination answer booklet PDF
for TKR College of Engineering and Technology - Machine Learning (B.Tech V Sem).

Specifications requested:
- Authentic examination answer booklet with faint blue ruling & red left margin line.
- Handwritten typography using SegoePrint font in dark fountain pen blue ink.
- Part-A: 10 Qs (1 purposefully blank: Q1.h, 1 purposefully wrong: Q1.d, 8 correct).
- Part-B: 4 detailed answers across 4 pages:
  * 3 big answers (Pages 2, 3, 4) worth ~180 words each (Q3, Q4, Q6).
  * 1 last question (Page 5) worth ~180 words (Q9).
- Total Pages: 5 pages, each precisely calibrated to ~180 words.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONT_REGULAR = "SegoePrint"
FONT_BOLD = "SegoePrintBold"
pdfmetrics.registerFont(TTFont(FONT_REGULAR, "C:/Windows/Fonts/segoepr.ttf"))
pdfmetrics.registerFont(TTFont(FONT_BOLD, "C:/Windows/Fonts/segoeprb.ttf"))

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_X = 58
MARGIN_RIGHT = PAGE_WIDTH - 42
LINE_HEIGHT = 22
INK_BLUE = (0.08, 0.20, 0.45)
RULING_BLUE = (0.84, 0.89, 0.95)
MARGIN_RED = (0.92, 0.55, 0.55)


def draw_ruled_background(c: canvas.Canvas, page_num: int, total_pages: int = 5, show_exam_header: bool = False):
    """Draws realistic lined examination answer paper with margins."""
    c.saveState()
    
    # Paper slight ivory background
    c.setFillColorRGB(0.995, 0.995, 0.99)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=True, stroke=False)
    
    # Horizontal ruled lines
    c.setStrokeColorRGB(*RULING_BLUE)
    c.setLineWidth(0.65)
    start_y = 750 if show_exam_header else 785
    y = start_y
    while y >= 45:
        c.line(20, y, PAGE_WIDTH - 20, y)
        y -= LINE_HEIGHT
        
    # Vertical red margin line
    c.setStrokeColorRGB(*MARGIN_RED)
    c.setLineWidth(1.0)
    c.line(MARGIN_X, 35, MARGIN_X, PAGE_HEIGHT - 35)
    c.setLineWidth(0.4)
    c.line(MARGIN_X - 4, 35, MARGIN_X - 4, PAGE_HEIGHT - 35)

    # Top Header: Page Number
    c.setFont(FONT_BOLD, 10)
    c.setFillColorRGB(*INK_BLUE)
    c.drawRightString(PAGE_WIDTH - 45, PAGE_HEIGHT - 32, f"Page - {page_num} of {total_pages}")

    if show_exam_header:
        # Student Exam Details Box on Page 1
        c.setFont(FONT_BOLD, 10.5)
        c.drawString(MARGIN_X + 10, PAGE_HEIGHT - 35, "TKR COLLEGE OF ENGG. & TECH. — B.Tech V Sem Regular Exams (Nov 2025)")
        c.setFont(FONT_REGULAR, 9)
        c.drawString(MARGIN_X + 10, PAGE_HEIGHT - 50, "Hall Ticket No: 22TK1A0588   |   Name: B. Rahul Sharma   |   Branch: CSE (AI&ML)")
        c.drawString(MARGIN_X + 10, PAGE_HEIGHT - 65, "Subject: Machine Learning (4E5GD)   |   Date: 22.11.2025   |   Max Marks: 60")
        c.setStrokeColorRGB(0.2, 0.3, 0.5)
        c.setLineWidth(0.8)
        c.line(MARGIN_X, PAGE_HEIGHT - 72, PAGE_WIDTH - 35, PAGE_HEIGHT - 72)

    c.restoreState()


def render_page_1(c: canvas.Canvas):
    """Page 1: Student Exam Details + PART-A (10 Qs: 1 Blank, 1 Wrong, 8 Correct). ~180 words."""
    draw_ruled_background(c, page_num=1, total_pages=5, show_exam_header=True)
    c.saveState()

    y = 740
    c.setFont(FONT_BOLD, 11)
    c.setFillColorRGB(*INK_BLUE)
    c.drawString(MARGIN_X + 15, y, "PART - A  (Compulsory: 10 x 1M = 10 Marks)")
    c.line(MARGIN_X + 15, y - 2, MARGIN_X + 270, y - 2)

    # Q1.a) Define Machine Learning (CORRECT)
    y -= LINE_HEIGHT + 3
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Q1. a)")
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "Machine Learning is an AI field where computer algorithms learn from experience E")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "to improve performance P at task T without explicit programmed instructions.")

    # Q1.b) Perspectives of machine learning (CORRECT)
    y -= LINE_HEIGHT
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Q1. b)")
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "Perspectives: 1. Experience representation, 2. Hypothesis search space,")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "3. Loss optimization, and 4. Generalization capability on unseen data.")

    # Q1.c) Perceptron definition + diagram (CORRECT)
    y -= LINE_HEIGHT
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Q1. c)")
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "Perceptron: A linear classifier unit calculating y = f(∑ wi xi + b), returning")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "1 if net sum ≥ θ, else 0. [Diagram: Inputs x1, x2 -> ∑(w_i x_i + b) -> f(net) -> y].")

    # Q1.d) Define SVM (PURPOSEFULLY WRONG - System Variable Matrix!)
    y -= LINE_HEIGHT
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Q1. d)")
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "SVM stands for 'System Variable Matrix'. It is a Linux kernel process scheduler")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "used to balance virtual memory pages across CPU hardware registers.")

    # Q1.e) Ensemble learning (CORRECT)
    y -= LINE_HEIGHT
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Q1. e)")
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "Ensemble learning combines multiple weak learners via Bagging or Boosting")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "to produce a stronger model with reduced variance and bias (e.g. Random Forest).")

    # Q1.f) Unsupervised Learning (CORRECT)
    y -= LINE_HEIGHT
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Q1. f)")
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "Unsupervised learning trains models on unlabeled data to discover underlying")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "clusters, density groupings, and hidden representations without supervisor guidance.")

    # Q1.g) Dimensionality Reduction (CORRECT)
    y -= LINE_HEIGHT
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Q1. g)")
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "Dimensionality reduction transforms high-dimensional features into fewer dimensions,")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "retaining maximal information while mitigating the curse of dimensionality (PCA/LDA).")

    # Q1.h) Define Isomap (PURPOSEFULLY LEFT BLANK!)
    y -= LINE_HEIGHT
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Q1. h)")
    c.setFont(FONT_REGULAR, 8.5)
    c.setFillColorRGB(0.55, 0.55, 0.55)
    c.drawString(MARGIN_X + 10, y, "( left blank — unattempted )")
    c.setFillColorRGB(*INK_BLUE)
    y -= LINE_HEIGHT  # empty line

    # Q1.i) Reinforcement Learning (CORRECT)
    y -= LINE_HEIGHT
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Q1. i)")
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "Reinforcement learning is a trial-and-error paradigm where an agent takes")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "actions in an environment to learn an optimal policy maximizing cumulative rewards.")

    # Q1.j) Need of Bayesian Networks (CORRECT)
    y -= LINE_HEIGHT
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Q1. j)")
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "Bayesian networks compactly represent joint probability distributions by exploiting")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "conditional independencies via DAGs, enabling causal and probabilistic reasoning.")

    c.restoreState()
    c.showPage()


def render_page_2(c: canvas.Canvas):
    """Page 2: PART-B: Question 3 (Find-S Algorithm Trace + Linear Separability). ~180 words."""
    draw_ruled_background(c, page_num=2, total_pages=5)
    c.saveState()

    y = 770
    c.setFont(FONT_BOLD, 11)
    c.setFillColorRGB(*INK_BLUE)
    c.drawString(MARGIN_X + 15, y, "PART - B  |  UNIT - I  |  Ans to Question 3")
    c.line(MARGIN_X + 15, y - 2, MARGIN_X + 260, y - 2)

    # Ans 3.a) Find-S Algorithm trace (7M)
    y -= LINE_HEIGHT + 2
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Ans 3.a)")
    c.drawString(MARGIN_X + 10, y, "Find-S Algorithm Execution on EnjoySport Dataset:")
    
    y -= LINE_HEIGHT
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "Find-S finds the most specific hypothesis consistent with positive examples.")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "Initial Hypothesis:  h0 = < ∅, ∅, ∅, ∅, ∅, ∅ > (most specific hypothesis).")
    
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "• Example 1 (+): <Sunny, Warm, Normal, Strong, Warm, Same> -> Yes")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 22, y, "First positive instance: h1 = <Sunny, Warm, Normal, Strong, Warm, Same>.")

    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "• Example 2 (+): <Sunny, Warm, High, Strong, Warm, Same> -> Yes")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 22, y, "Humidity differs (Normal vs High). Generalize to '?': h2 = <Sunny, Warm, ?, Strong, Warm, Same>.")

    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "• Example 3 (-): <Rainy, Cold, High, Strong, Warm, Change> -> No")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 22, y, "Negative instance: Find-S completely ignores negative instances: h3 = h2.")

    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "• Example 4 (+): <Sunny, Warm, High, Strong, Cold, Change> -> Yes")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 22, y, "Water and Forecast differ, generalize both: h4 = <Sunny, Warm, ?, Strong, ?, ?>.")
    y -= LINE_HEIGHT
    c.setFont(FONT_BOLD, 9.5)
    c.drawString(MARGIN_X + 10, y, "Final Maximally Specific Hypothesis:  h_final = < Sunny, Warm, ?, Strong, ?, ? >")

    # Ans 3.b) Linear Separability (3M)
    y -= LINE_HEIGHT + 4
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Ans 3.b)")
    c.drawString(MARGIN_X + 10, y, "Linear Separability with Suitable Example:")
    
    y -= LINE_HEIGHT
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "Two classes in d-dimensional space are linearly separable if a hyperplane w^T x + b = 0")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "completely divides positive from negative points without any misclassification.")
    
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "Example: Logical AND gate is linearly separable because boundary x1 + x2 - 1.5 = 0")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "separates output 1 from 0. In contrast, XOR cannot be separated by a single straight line.")

    # Small diagram
    c.setStrokeColorRGB(*INK_BLUE)
    c.setLineWidth(0.8)
    dx, dy = MARGIN_X + 290, y - 55
    c.line(dx, dy, dx + 75, dy)
    c.line(dx, dy, dx, dy + 55)
    c.line(dx + 10, dy + 50, dx + 60, dy + 5)
    c.circle(dx + 18, dy + 18, 3, fill=True)
    c.circle(dx + 15, dy + 32, 3, fill=True)
    c.rect(dx + 48, dy + 42, 5, 5, fill=True)
    c.setFont(FONT_REGULAR, 7.5)
    c.drawString(dx + 12, dy - 10, "Fig: Hyperplane w^T x + b = 0")

    c.restoreState()
    c.showPage()


def render_page_3(c: canvas.Canvas):
    """Page 3: PART-B: Question 4 (Multi-Layer Perceptron & RBF vs MLP Comparison). ~180 words."""
    draw_ruled_background(c, page_num=3, total_pages=5)
    c.saveState()

    y = 770
    c.setFont(FONT_BOLD, 11)
    c.setFillColorRGB(*INK_BLUE)
    c.drawString(MARGIN_X + 15, y, "PART - B  |  UNIT - II  |  Ans to Question 4")
    c.line(MARGIN_X + 15, y - 2, MARGIN_X + 265, y - 2)

    # Ans 4.a) Multi-Layer Perceptron (5M)
    y -= LINE_HEIGHT + 2
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Ans 4.a)")
    c.drawString(MARGIN_X + 10, y, "Multi-Layer Perceptron (MLP) Architecture and Backpropagation:")

    y -= LINE_HEIGHT
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "A Multi-Layer Perceptron is a feedforward neural network comprising an input layer,")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "one or more hidden layers, and an output layer capable of learning non-linear mappings.")
    
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "1. Forward Propagation: Hidden unit activation z_j = σ(∑ w_ji x_i + b_j), where σ is")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "   the Sigmoid function 1 / (1 + e^-z). Output unit computes y_k = g(∑ v_kj z_j + c_k).")

    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "2. Backpropagation Learning: Minimizes squared error loss E = 0.5 ∑ (t_k - y_k)^2 by gradient")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "   descent with chain rule: Δw_ji = -η (∂E/∂w_ji) = η δ_j x_i, iteratively updating weights.")

    # Ans 4.b) RBF Networks vs MLP Comparison (5M)
    y -= LINE_HEIGHT + 6
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Ans 4.b)")
    c.drawString(MARGIN_X + 10, y, "Comparison: Radial Basis Function (RBF) Networks vs Multi-Layer Perceptrons:")

    # Table layout
    y -= LINE_HEIGHT + 2
    c.setFont(FONT_BOLD, 9)
    c.drawString(MARGIN_X + 10, y, "Aspect / Feature")
    c.drawString(MARGIN_X + 140, y, "Radial Basis Function (RBF)")
    c.drawString(MARGIN_X + 320, y, "Multi-Layer Perceptron (MLP)")
    c.setLineWidth(0.6)
    c.line(MARGIN_X + 10, y - 2, PAGE_WIDTH - 45, y - 2)

    rows = [
        ("Hidden Unit Function", "Localized Gaussian kernel exp(-γ||x-μ||^2)", "Global sigmoidal hyperplane σ(w^Tx+b)"),
        ("Network Depth", "Strictly single hidden layer", "Arbitrary multiple hidden layers (Deep)"),
        ("Training Method", "Two-stage decoupled: K-means + Linear", "End-to-end iterative Backpropagation"),
        ("Convergence Speed", "Very fast direct pseudo-inverse solve", "Slower iterative gradient descent"),
        ("Output Nature", "Linear weighted sum of basis responses", "Non-linear layered transformations")
    ]

    for aspect, rbf_val, mlp_val in rows:
        y -= LINE_HEIGHT
        c.setFont(FONT_BOLD, 8.5)
        c.drawString(MARGIN_X + 10, y, aspect)
        c.setFont(FONT_REGULAR, 8.5)
        c.drawString(MARGIN_X + 140, y, rbf_val)
        c.drawString(MARGIN_X + 320, y, mlp_val)

    y -= LINE_HEIGHT
    c.setFont(FONT_REGULAR, 9)
    c.drawString(MARGIN_X + 10, y, "Conclusion: RBF networks excel at localized function approximation; MLPs generalize globally.")

    c.restoreState()
    c.showPage()


def render_page_4(c: canvas.Canvas):
    """Page 4: PART-B: Question 6 (Decision Tree Algorithm, ASM Mechanism & Probabilistic Models). ~180 words."""
    draw_ruled_background(c, page_num=4, total_pages=5)
    c.saveState()

    y = 770
    c.setFont(FONT_BOLD, 11)
    c.setFillColorRGB(*INK_BLUE)
    c.drawString(MARGIN_X + 15, y, "PART - B  |  UNIT - III  |  Ans to Question 6")
    c.line(MARGIN_X + 15, y - 2, MARGIN_X + 270, y - 2)

    # Ans 6.a) Decision Tree & ASM Mechanisms (6M)
    y -= LINE_HEIGHT + 2
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Ans 6.a)")
    c.drawString(MARGIN_X + 10, y, "Decision Tree Construction & Attribute Selection Measures (ASM):")

    y -= LINE_HEIGHT
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "Decision Tree algorithms (ID3/C4.5) build a predictive tree using top-down greedy splitting:")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "1. Calculate Entropy of target dataset S:  Entropy(S) = - ∑ p_i log2(p_i).")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "2. For each attribute A, compute Information Gain:")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 25, y, "Gain(S, A) = Entropy(S) - ∑ (|S_v| / |S|) * Entropy(S_v).")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "3. Pick attribute maximizing Gain as split node. Partition data and repeat recursively.")

    y -= LINE_HEIGHT
    c.setFont(FONT_BOLD, 9.5)
    c.drawString(MARGIN_X + 10, y, "ASM Mechanisms Comparison:")
    y -= LINE_HEIGHT
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "• Information Gain: Quantifies entropy drop; inherently biased toward attributes with many values.")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "• Gain Ratio (C4.5): Overcomes bias by dividing Gain by Split Information: Gain / SplitInfo(A).")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "• Gini Index (CART): Impurity metric Gini(S) = 1 - ∑ p_i^2; chooses split minimizing Gini.")

    # Ans 6.b) Probabilistic Learning Models (4M)
    y -= LINE_HEIGHT + 4
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Ans 6.b)")
    c.drawString(MARGIN_X + 10, y, "Classification of Probabilistic Learning Models:")

    y -= LINE_HEIGHT
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "Probabilistic ML models represent uncertainty using Bayes theorem. Divided into two classes:")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "1. Generative Models: Model joint distribution P(X, Y) = P(X|Y) * P(Y) to capture how data")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 22, y, "was generated. Examples: Naive Bayes, Hidden Markov Models (HMM), and Gaussian Mixtures.")

    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "2. Discriminative Models: Model conditional probability P(Y|X) directly to separate classes.")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 22, y, "Examples: Logistic Regression, Conditional Random Fields (CRF), and Bayesian Perceptrons.")

    c.restoreState()
    c.showPage()


def render_page_5(c: canvas.Canvas):
    """Page 5: PART-B: Question 9 (Linear Discriminant Analysis - LDA). ~180 words."""
    draw_ruled_background(c, page_num=5, total_pages=5)
    c.saveState()

    y = 770
    c.setFont(FONT_BOLD, 11)
    c.setFillColorRGB(*INK_BLUE)
    c.drawString(MARGIN_X + 15, y, "PART - B  |  UNIT - IV  |  Ans to Question 9 (Final Answer)")
    c.line(MARGIN_X + 15, y - 2, MARGIN_X + 310, y - 2)

    # Ans 9) LDA in High Dimensional Datasets (10M)
    y -= LINE_HEIGHT + 2
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN_X - 42, y, "Ans 9)")
    c.drawString(MARGIN_X + 10, y, "Linear Discriminant Analysis (LDA) for Improving Class Separability:")

    y -= LINE_HEIGHT
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "Linear Discriminant Analysis is a supervised dimensionality reduction algorithm that finds")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "an optimal linear projection vector w maximizing class separation while minimizing intra-class")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "variance in high-dimensional feature spaces.")

    y -= LINE_HEIGHT
    c.setFont(FONT_BOLD, 9.5)
    c.drawString(MARGIN_X + 10, y, "1. Scatter Matrices Formulation:")
    y -= LINE_HEIGHT
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "• Within-Class Scatter Matrix (S_W): Measures compactness of points around class centroids:")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 25, y, "S_W = ∑_{c=1}^C ∑_{x ∈ C_c} (x - μ_c)(x - μ_c)^T, where μ_c is class mean.")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "• Between-Class Scatter Matrix (S_B): Measures separation between class means and overall mean μ:")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 25, y, "S_B = ∑_{c=1}^C N_c (μ_c - μ)(μ_c - μ)^T.")

    y -= LINE_HEIGHT
    c.setFont(FONT_BOLD, 9.5)
    c.drawString(MARGIN_X + 10, y, "2. Fisher's Criterion Optimization:")
    y -= LINE_HEIGHT
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "LDA maximizes the Fisher criterion:  J(w) = (w^T S_B w) / (w^T S_W w).")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "Taking derivative w.r.t w yields generalized eigenvalue problem: (S_W^-1 S_B) w = λ w.")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "The optimal projection vector w is the eigenvector corresponding to the largest eigenvalue λ.")

    y -= LINE_HEIGHT
    c.setFont(FONT_BOLD, 9.5)
    c.drawString(MARGIN_X + 10, y, "3. Class Separability Impact:")
    y -= LINE_HEIGHT
    c.setFont(FONT_REGULAR, 9.5)
    c.drawString(MARGIN_X + 10, y, "Unlike PCA which only captures maximal variance, LDA preserves class labels, collapsing clusters")
    y -= LINE_HEIGHT
    c.drawString(MARGIN_X + 10, y, "tightly around their means while pushing group centers apart, yielding clean linear boundaries.")

    c.restoreState()
    c.showPage()


def generate_exam_answer_key_pdf(output_path: str):
    """Generates the full 5-page student examination answer booklet."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    c = canvas.Canvas(output_path, pagesize=A4)
    c.setTitle("TKR_ML_Examination_Student_Answer_Sheet_Nov2025")
    c.setAuthor("B. Rahul Sharma (22TK1A0588)")
    c.setSubject("Machine Learning Student Handwritten Answer Key Script")

    render_page_1(c)
    render_page_2(c)
    render_page_3(c)
    render_page_4(c)
    render_page_5(c)

    c.save()
    print(f"Generated 5-page student answer booklet successfully: {output_path}")


if __name__ == "__main__":
    out_file = os.path.join(os.path.dirname(__file__), "Dataset", "machine_learning_student_answer_sheet.pdf")
    generate_exam_answer_key_pdf(out_file)
