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
        switch(look.tag){
            case '(':
                expr();
            break;
            case Tag.NUM:
                expr();
            break;
            default:
                error("error in start");
        }
        match(Tag.EOF);
        return;
    }

    private void expr() {
        switch(look.tag){
            case '(':
                term();
                exprp();
            break;
            case Tag.NUM:
                term();
                exprp();
            break;
            default:
                error("error in expr");
        }
    }

    private void exprp() {
        switch (look.tag) {
        case '+':
            match('+');
            term();
            exprp();
        break;
        case '-':
            match('-');
            term();
            exprp();
        break;
        case Tag.EOF:
        break;
        case ')':
        break;
        default:
                error("error in exprp");
        }
    }

    private void term() {
        switch(look.tag){
            case '(':
                fact();
                termp();
            break;
            case Tag.NUM:
                fact();
                termp();
            break;
            default:
                error("error in term");
        }
    }

    private void termp() {
        switch(look.tag){
            case '*':
                match('*');
                fact();
                termp();
            break;
            case '/':
                match('/');
                fact();
                termp();
            break;
            case '+':
            break;
            case '-':
            break;
            case Tag.EOF:
            break;
            case ')':
            break;
            default:
                error("error in termp");
        }
    }

    private void fact() {
        switch(look.tag){
            case '(':
                match('(');
                expr();
                match(')');
            break;
            case Tag.NUM:
                match(Tag.NUM);
            break;
            default:
                error("error in fact");
        }
    }
		
    public static void main(String[] args) {
        Lexer lex = new Lexer();
        String path = "text.txt"; // il percorso del file da leggere
        try {
            BufferedReader br = new BufferedReader(new FileReader(path));
            Parser parser = new Parser(lex, br);
            parser.start();
            System.out.println("Input OK");
            br.close();
        } catch (IOException e) {e.printStackTrace();}
    }
}