import java.io.*;

public class Parser {
    private Lexer lex;
    private BufferedReader pbr;
    private Token look;

    public Parser(Lexer l, BufferedReader br) {
        lex = l;
        pbr = br;
        move();
    }

    void move() {
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

    public void prog() {
        switch(look.tag){
            case Tag.ASSIGN:
                statlist();
            break;
            case Tag.PRINT:
                statlist();
            break;
            case Tag.READ:
                statlist();
            break;
            case Tag.IF:
                statlist();
            break;
            case Tag.FOR:
                statlist();
            break;
            case '{':
                statlist();
            break;
        }
        match(Tag.EOF);
        return;
    }

    private void statlist() {
        switch(look.tag){
            case Tag.ASSIGN:
                stat();
                statlistp();
            break;
            case Tag.PRINT:
                stat();
                statlistp();
            break;
            case Tag.READ:
                stat();
                statlistp();
            break;
            case Tag.IF:
                stat();
                statlistp();
            break;
            case Tag.FOR:
                stat();
                statlistp();
            break;
            case '{':
                stat();
                statlistp();
            break;
        }
    }

    private void statlistp() {
        switch(look.tag){
            case ';':
                match(';');
                stat();
                statlistp();
            break;
            case '}':
            break;
            case Tag.EOF:
            break;
        }
    }

    private void stat() {
        switch(look.tag){
            case Tag.ASSIGN:
                match(Tag.ASSIGN);
                assignlist();
            break;
            case Tag.PRINT:
                match(Tag.PRINT);
                match('('); 
                exprlist();
                match(')');
            break;
            case Tag.READ:
                match(Tag.READ);
                match('(');
                idlist();
                match(')');
            break;
            case Tag.IF:
                match(Tag.IF);
                match('(');
                bexpr();
                match(')');
                stat();
                ifp();
            break;
            case Tag.FOR:
                match(Tag.FOR);
                match('(');
                forp();
                bexpr();
                match(')');
                match(Tag.DO);
                stat();
            break;
            case '{':
                match('{');
                statlist();
                match('}');
        }
    }

    private void ifp() {
        switch(look.tag){
            case Tag.ELSE:
                match(Tag.ELSE);
                stat();
                match(Tag.END);
            break;
            case Tag.END:
                match(Tag.END);
            break;
        }
    }

    private void forp() {
        switch(look.tag){
            case Tag.ID:
                match(Tag.ID);
                match(':');
                match('=');
                expr();
                match(';');
            break;
        }
    }

    private void assignlist() {
        switch(look.tag){
            case '[':
                match('[');
                expr();
                match(Tag.TO);
                idlist();
                match(']');
                assignlistp();
            break;
        }
    }

    private void assignlistp() {
        switch(look.tag){
            case '[':
                match('[');
                expr();
                match(Tag.TO);
                idlist();
                match(']');
                assignlistp();
            break;
            case Tag.ELSE:
            break;
            case Tag.END:
            break;
            case '}':
            break;
            case Tag.EOF:
            break;
        }
    }

    private void idlist() {
        switch(look.tag){
            case Tag.ID:
                match(Tag.ID);
                idlistp();
            break;
        }
    }

    private void idlistp() {
        switch(look.tag){
            case ',':
                match(',');
                match(Tag.ID);
                idlistp();
            break;
            case ']':
            break;
            case ')':
            break;
        }
    }

    private void bexpr() {
        switch(look.tag){
            case Tag.RELOP:
                match(Tag.RELOP);
                expr();
                expr();
            break;
        }
    }

    private void expr() {
        switch(look.tag){
            case '+':
                match('+'); 
                match('(');
                exprlist();
                match(')');
            break;
            case '-':
                match('-');
                expr();
                expr();
            break;
            case '*':
                match('+'); 
                match('(');
                exprlist();
                match(')');
            break;
            case '/':
                match('/');
                expr();
                expr();
            break;
            case Tag.NUM:
                match(Tag.NUM);
            break;
            case Tag.ID:
                match(Tag.ID);
            break;
        }
    }

    private void exprlist() {
        switch(look.tag){
            case '+':
            break;
            case '-':
            break;
            case '*':
            break;
            case '/':
            break;
            case Tag.NUM:
            break;
            case Tag.ID:
            break;
        }
        expr();
        exprlistp();
    }

    private void exprlistp() {
        switch(look.tag){
            case ',':
                match(',');
                expr();
                exprlistp();
            break;
            case ')':
            break;
        }
    }
		
    public static void main(String[] args) {
        Lexer lex = new Lexer();
        String path = "src/text.txt"; // il percorso del file da leggere
        try {
            BufferedReader br = new BufferedReader(new FileReader(path));
            Parser parser = new Parser(lex, br);
            parser.prog();
            System.out.println("Input OK");
            br.close();
        } catch (IOException e) {e.printStackTrace();}
    }
}