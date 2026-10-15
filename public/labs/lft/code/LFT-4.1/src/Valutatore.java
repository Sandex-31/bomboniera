import java.io.*; 

public class Valutatore {
    private Lexer lex;
    private BufferedReader pbr;
    private Token look;

    public Valutatore(Lexer l, BufferedReader br) { 
	lex = l; 
	pbr = br;
	move(); 
    }
   
    void move() { 
        look = lex.lexical_scan(pbr);
        if(look.tag == 272)
            look = lex.lexical_scan(pbr);
        System.out.println("token = " + look);
    }

    void error(String s) { 
        throw new Error("near line " + lex.line + ": " + s);
    }

    void match(int t) {
        if (look.tag == t) {
            if (look.tag != Tag.EOF) move();
        } else error("syntax error");
    }

    public void start() { 
        int expr_val;
        switch(look.tag){
            case '(':
            break;
            case Tag.NUM:
            break;
            default:
                error("error in start");
        }
    	expr_val = expr();
	    match(Tag.EOF);
        System.out.println("Risultato-> " + expr_val);
        return;
    }

    private int expr() { 
	int exprp_i, exprp_val;
	switch(look.tag){
        case '(':
        break;
        case Tag.NUM:
        break;
        default:
            error("syntax error");
    }
    exprp_i = term();
	exprp_val = exprp(exprp_i);
	return exprp_val;
    }

    private int exprp(int exprp_i) {
	int exprp1_i, exprp_val = 0;
	switch (look.tag) {
	    case '+':
            match('+');
            exprp1_i = exprp_i + term();
            exprp_val = exprp(exprp1_i);
        break;
        case '-':
            match('-');
            exprp1_i = exprp_i + term();
            exprp_val = exprp(exprp1_i);
        break;
        case Tag.EOF:
            exprp_val = exprp_i;
        break;
        case ')':
            exprp_val = exprp_i;
        break;
	}
    return exprp_val;
    }

    private int term() { 
        int termp_i,term_val = 0;
        switch(look.tag){
            case '(':
                termp_i = fact();
                term_val = termp(termp_i);
            break;
            case Tag.NUM:
                termp_i = fact();
                term_val = termp(termp_i);
            break;
        }
        return term_val;
    }
    
    private int termp(int termp_i) { 
        int termp_val,termp1_i;
        switch (look.tag) {
            case '*':
                match('*');
                termp1_i = termp_i * fact();
                termp_val = termp(termp1_i);
            break;
            case '/':
                match('/');
                termp1_i = termp_i / fact();
                termp_val = termp(termp1_i);
            break;
            case '-':
                termp_val= termp_i;
            break;
            case '+':
                termp_val = termp_i;
            break;
            case ')':
                termp_val = termp_i;
            break;
            default:
                termp_val = termp_i;
                break;
        }
        return termp_val;
    }
    
    private int fact() { 
        int fact_val = 0;
        switch(look.tag){
            case '(':
                match('(');
                fact_val = expr();
                match(')');
            break;
            case Tag.NUM:
                fact_val = ((NumberTok) look).getInt();
                match(Tag.NUM);
            break;
        }
        return fact_val;
    }

    public static void main(String[] args) {
        Lexer lex = new Lexer();
        String path = "text.txt";
        try {
            BufferedReader br = new BufferedReader(new FileReader(path));
            Valutatore valutatore = new Valutatore(lex, br);
            valutatore.start();
            br.close();
        } catch (IOException e) {e.printStackTrace();}
    }
}
