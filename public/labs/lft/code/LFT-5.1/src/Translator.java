import java.io.*;

public class Translator {
    private Lexer lex;
    private BufferedReader pbr;
    private Token look;
    
    SymbolTable st = new SymbolTable();
    CodeGenerator code = new CodeGenerator();
    int count=0;

    public Translator(Lexer l, BufferedReader br) {
        lex = l;
        pbr = br;
        move();
    }

    void move() { 
        look = lex.lexical_scan(pbr);

        //eliminazione output del commento

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

    public void prog() {  
        switch(look.tag){
            case Tag.ASSIGN:
            break;
            case Tag.PRINT:
            break;
            case Tag.READ:
            break;
            case Tag.IF:
            break;
            case Tag.FOR:
            break;
            case '{':
            break;
            default:
                error("error in start");
        }  
        int lnext_prog = code.newLabel();
        statlist(lnext_prog);
        code.emitLabel(lnext_prog);
        match(Tag.EOF);
        try {
        	code.toJasmin();
        }
        catch(java.io.IOException e) {
        	System.out.println("IO error\n");
        };  
    }

    public void stat() {
        switch(look.tag) {
            case Tag.ASSIGN:
                match(Tag.ASSIGN);
                assignlist();
            break;
            case Tag.PRINT:
                match(Tag.PRINT);
                match('('); 
                exprlist(1);
                match(')');
            break;
            case Tag.IF:
                match(Tag.IF);
                match('(');
                int endF = bexpr();     //label end o else dell'if 
                match(')');
                stat();
                ifp(endF);

            break;
            case Tag.FOR:
                match(Tag.FOR);
                match('(');
                forp();
                code.newLabel();
                int forL = code.label;  //label per il loop for
                code.emit(OpCode.label,code.label);
                int end = bexpr();      //label fine del for
                match(')');
                match(Tag.DO);
                stat();
                code.emit(OpCode.GOto,forL);
                code.emit(OpCode.label, end);
            break;
            case '{':
                match('{');
                statlist(0);
                match('}');
            break;
            case Tag.READ:
                match(Tag.READ);
                match('(');
                idlist(1);
                match(')');
            break;
        }
     }
    
     private void assignlist() {
        switch(look.tag){
            case '[':
                match('[');
                expr(2);
                match(Tag.TO);
                idlist(2);
                match(']');
                code.emit(OpCode.pop);
                assignlistp();
            break;
        }
    }

    private void assignlistp() {
        switch(look.tag){
            case '[':
                match('[');
                expr(2);
                match(Tag.TO);
                idlist(2);
                match(']');
                code.emit(OpCode.pop);
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

     private void forp() {
        switch(look.tag){
            case Tag.ID:
                int id_addr = st.lookupAddress(((Word)look).lexeme);
                if (id_addr==-1) {
                    id_addr = count;
                    st.insert(((Word)look).lexeme,count++);
                }
                match(Tag.ID);
                match(Tag.INIT);
                expr(0);
                code.emit(OpCode.istore,id_addr);
                match(';');
            break;
            case Tag.RELOP:
            break;
        }
    }

     private void ifp(int end) {
        switch(look.tag){
            case Tag.ELSE:
                code.newLabel();
                code.emit(OpCode.GOto,code.label);
                match(Tag.ELSE);
                code.emit(OpCode.label,end);
                stat();
                match(Tag.END);
                code.emit(OpCode.label,code.label);
            break;
            case Tag.END:
                code.emit(OpCode.label,end);
                match(Tag.END);
            break;
            default:
                error("missing token in ifp");
        }
    }

    private void idlist(int i /* l'id i se 1 corrisponde al READ */) {
        switch(look.tag) {
            case Tag.ID:
                int id_addr = st.lookupAddress(((Word)look).lexeme);
                if (id_addr==-1) {
                    id_addr = count;
                    st.insert(((Word)look).lexeme,count++);
                }
                match(Tag.ID);
                if(i == 1){
                    code.emit(OpCode.invokestatic,0);
                    code.emit(OpCode.istore,id_addr);
                }else if(i == 2){
                    code.emit(OpCode.dup);
                    code.emit(OpCode.istore,id_addr);
                }else
                    code.emit(OpCode.istore,id_addr);
                idlistp(i);
            break;
            default:
                error("error in idlist");
    	}
    }

    private void idlistp(int i) {
        switch(look.tag){
            case ',':
                match(',');
                int id_addr = st.lookupAddress(((Word)look).lexeme);
                if (id_addr==-1) {
                    id_addr = count;
                    st.insert(((Word)look).lexeme,count++);
                }
                match(Tag.ID);
                if(i == 1){
                    code.emit(OpCode.invokestatic,0);
                    code.emit(OpCode.istore,id_addr);  
                }else if(i == 2){
                    code.emit(OpCode.dup);
                    code.emit(OpCode.istore,id_addr);
                }else
                    code.emit(OpCode.istore,id_addr);
                idlistp(i);
            break;
            case ']':
            break;
            case ')':
            break;
            default:
                error("error in idlistp");
        }
    }

    private int bexpr() {
        switch(look.tag){
            case Tag.RELOP:
                String Relop = ((Word)look).lexeme;
                match(Tag.RELOP);
                expr(0);
                expr(0);
                code.newLabel();
                switch(Relop){
                    case "<":
                        code.emit(OpCode.if_icmpge, code.label);
                        return code.label;
                    case ">":
                        code.emit(OpCode.if_icmple, code.label);
                        return code.label;
                    case "==":
                        code.emit(OpCode.if_icmpne, code.label);
                        return code.label;
                    case "<=":
                        code.emit(OpCode.if_icmpgt, code.label);
                        return code.label;
                    case ">=":
                        code.emit(OpCode.if_icmplt, code.label);
                        return code.label;
                    case "<>":
                        code.emit(OpCode.if_icmpeq, code.label);
                        return code.label;
                    default:
                        error("error in relop");
                        return 0;
                }
            default:
                return 0;
        }
    }

    private void statlist(int lnext_prog){
        switch(look.tag){
            case Tag.ASSIGN:
            break;
            case Tag.PRINT:
            break;
            case Tag.READ:
            break;
            case Tag.IF:
            break;
            case Tag.FOR:
            break;
            case '{':
            break;
            default:
                error("error in statlist");
        }
        stat();
        statlistp();
    }

    private void expr(int i /* l'id i se 1 corrisponde a PRINT */) {
        switch(look.tag) {
            case '+':
                match('+'); 
                match('(');
                exprlist(0);
                code.emit(OpCode.iadd);
                match(')');
            break;
            case '*':
                match('*'); 
                match('(');
                exprlist(0);
                code.emit(OpCode.imul);
                match(')');
            break;
            case '/':
                match('/');
                expr(0);
                expr(0);
                code.emit(OpCode.idiv);
            break;
            case Tag.NUM:
                int num = ((NumberTok) look).lexeme;
                code.emit(OpCode.ldc,num);
                match(Tag.NUM);
            break;
            case Tag.ID:
                int id_addr = st.lookupAddress(((Word)look).lexeme);
                if (id_addr==-1) {
                    id_addr = count;
                    st.insert(((Word)look).lexeme,count++);
                }
                match(Tag.ID);
                code.emit(OpCode.iload,id_addr);
            break;
            case '-':
                match('-');
                expr(0);
                expr(0);
                code.emit(OpCode.isub);
            break;
        }
        if(i == 1)
            code.emit(OpCode.invokestatic,1);
    }

    private void exprlistp(int i) {
        switch(look.tag){
            case ',':
                match(',');
                expr(i);
                exprlistp(i);
            break;
            case ')':
            break;
        }
    }

    private void exprlist(int i) {
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
        expr(i);
        exprlistp(i);
    }

    private void statlistp(){
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
    

    public static void main(String[] args) {
        Lexer lex = new Lexer();
        String path = "text.txt";
        try {
            BufferedReader br = new BufferedReader(new FileReader(path));
            Translator translator = new Translator(lex, br);
            translator.prog();
            System.out.println("Input OK");
            br.close();
        } catch (IOException e) {e.printStackTrace();}
    }
}
