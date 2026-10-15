import java.io.*;

public class Lexer {

    public static int line = 1;
    private char peek = ' ';

    private void readch(BufferedReader br) {
        try {
            peek = (char) br.read();
        } catch (IOException exc) {
            peek = (char) -1; // ERROR
        }
    }

    public Token lexical_scan(BufferedReader br) {
        while (peek == ' ' || peek == '\t' || peek == '\n'  || peek == '\r') {
            if (peek == '\n') line++;
            readch(br);
        }
        
        switch (peek) {
            case '!':
                peek = ' ';
                return Token.not;
            
            case '(':
                peek = ' ';
                return Token.lpt;

            case ')':
                peek = ' ';
                return Token.rpt;
            
            case '[':
                peek = ' ';
                return Token.lpq;

            case ']':
                peek = ' ';
                return Token.rpq;

            case '{':
                peek = ' ';
                return Token.lpg;

            case '}':    
                peek = ' ';
                return Token.rpg;
            
            case '+':
                peek = ' ';
                return Token.plus;
            
            case '-':
                peek = ' ';
                return Token.minus;

            case '*':
                peek = ' ';
                return Token.mult;

            case '/':
                readch(br);
                if(peek == '*'){
                    boolean fine = false;
                    while(!fine){
                        readch(br);
                        if(peek == '*'){
                            readch(br);
                            if(peek == '/'){
                                fine = true;
                            }
                        }else if(peek == (char) -1){
                            System.err.println("Comment not closed");
                            peek = ' ';
                            fine = true;
                        }
                    }
                }else if(peek == '/'){
                    boolean fine = false;
                    while(!fine){
                        readch(br);
                        if(peek == '\n' || peek == (char) -1){
                            fine = true;
                        }
                    }
                }else if(peek == (char) -1){
                    return new Token(Tag.EOF);
                }else{
                    return Token.div;
                }
            break;

            case ';':
                peek = ' ';
                return Token.semicolon;

            case ',':
                peek = ' ';
                return Token.comma;
	// ... gestire i casi di ( ) [ ] { } + - * / ; , ... //
	
            case '&':
                readch(br);
                if (peek == '&') {
                    peek = ' ';
                    return Word.and;
                } else {
                    System.err.println("Erroneous character"
                            + " after & : "  + peek );
                    return null;
                }
            
            case '|':
                readch(br);
                if (peek == '|') {
                    peek = ' ';
                    return Word.or;
                } else {
                    System.err.println("Erroneous character"
                            + " after | : "  + peek );
                    return null;
                }

            case '<':
                readch(br);
                if (peek == '=') {
                    peek = ' ';
                    return Word.le;
                }else if(peek == '>'){
                    peek = ' ';
                    return Word.ne;
                }else if(peek == ' '){
                    peek = ' ';
                    return Word.lt;
                }else if(Character.isDigit(peek)){
                    peek = ' ';
                    return Word.lt;
                }else {
                    System.err.println("Erroneous character"
                            + " after < : "  + peek );
                    return null;
                }

            case '>':
                readch(br);
                if (peek == '=') {
                    peek = ' ';
                    return Word.ge;
                }else if(peek == ' '){
                    peek = ' ';
                    return Word.gt;
                }else if(Character.isDigit(peek)){
                    peek = ' ';
                    return Word.gt;
                }else {
                    System.err.println("Erroneous character"
                            + " after > : "  + peek );
                    return null;
                }

            case '=':
                readch(br);
                if (peek == '=') {
                    peek = ' ';
                    return Word.eq;
                } else {
                    System.err.println("Erroneous character"
                            + " after = : "  + peek );
                    return null;
                }
            
            case ':':
                readch(br);
                if (peek == '=') {
                    peek = ' ';
                    return Word.init;
                } else {
                    System.err.println("Erroneous character"
                            + " after = : "  + peek );
                    return null;
                }

	// ... gestire i casi di || < > <= >= == <> ... //
          
            case (char)-1:
                return new Token(Tag.EOF);

            default:
                if (Character.isLetter(peek)) {
                    if(peek == '_' || peek == '-'){
                        System.err.println("Erroneous character" + " after = : "  + peek ); 
                        return null;
                    }
                    StringBuffer str = new StringBuffer();
                    while(!Character.isWhitespace(peek) && peek != '(' && peek != ')' && peek != '[' && peek != ']' && peek != '{' && peek != '}' && peek != ','){
                        str.append(peek);
                        switch(str.toString()){
                            case "assign":
                                peek = ' ';
                                return Word.assign;

                            case "to":
                                peek = ' ';
                                return Word.to;

                            case "if":
                                peek = ' ';
                                return Word.iftok;

                            case "relop":
                                peek = ' ';
                                return new Token(Tag.RELOP);

                            case "else":
                                peek = ' ';
                                return Word.elsetok;

                            case "do":
                                peek = ' ';
                                return Word.dotok;

                            case "for":
                                peek = ' ';
                                return Word.fortok;

                            case "begin":
                                peek = ' ';
                                return Word.begin;

                            case "end":
                                peek = ' ';
                                return Word.end;

                            case "print":
                                peek = ' ';
                                return Word.print;

                            case "read":
                                peek = ' ';
                                return Word.read;
                            default:
                                readch(br);
                        }
                    }                    
                    String s = str.toString();
                    return new Word(Tag.ID,s);

	// ... gestire il caso degli identificatori e delle parole chiave //

                } else if (Character.isDigit(peek)) {
                    if(peek == 0){
                        return new NumberTok(Tag.NUM, 0);
                    }else{
                        int finalNum = Integer.parseInt(String.valueOf(peek));
                        readch(br);
                        while(Character.isDigit(peek)){
                            finalNum = finalNum * 10;
                            finalNum = finalNum + Integer.parseInt(String.valueOf(peek));
                            readch(br);
                        }
                        return new NumberTok(Tag.NUM, finalNum);
                    }
    
	// ... gestire il caso dei numeri ... //

                } else {
                        System.err.println("Erroneous character: " 
                                + peek );
                        return null;
                }
        }
        return new Token(Tag.COMM);
    }

    public static void main(String[] args) {
        Lexer lex = new Lexer();
        String path = "Prova.txt"; // il percorso del file da leggere
        try {
            BufferedReader br = new BufferedReader(new FileReader(path));
            Token tok;
            do {
                tok = lex.lexical_scan(br);
                System.out.println("Scan: " + tok);
            } while (tok.tag != Tag.EOF);
            br.close();
            System.out.print("ok");
        } catch (IOException e) {e.printStackTrace();}    
    }

}
