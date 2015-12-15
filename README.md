background
============

reason for SQL resultsets
-------------------------
NORADLE 已经有了绑定数据输出 html/xml 页面的简洁 API，
但是web应用发展的趋势是服务器端和客户端职能的完全分离，
服务端只提供数据和处理数据，
和UI相关的逻辑都放到浏览器端处理，
同时，浏览器外的客户端，也包括其他服务器程序，也会需要web数据服务.

因此，NORADLE 需要提供专门的数据输出服务，
可以调用简洁的API将 SQL result set 输出，
而客户端最终得到的是 JSON/javascript 数据，
直接可以集成进各种 js 客户端环境。
其意义在于用最简单的方式将oracle数据输出给javascript世界。

features
---------
* print sys_refcursor(sql query) result sets to compact raw format with metadata
* in server(noradle node http handler), client(browser), convert resultsets to javascript with meta data
* raw format is human readable, and reliable section/record/column separated, and very compact
* parent/child table data can print multiple resultsets with meta data about their relation, noradle parser can join them as hierachical data
* noradle can recognize restful URL, mapping to plsql package/procedure, put parameters for r.getx to retrieve
* for restful request, trim parse js object to object array or single object as restful service required
* can assign any consolidate supported template with parsed result data, do server-side render
* support ajax/jsonp based request both
* enhance browser-side parsing by providing support base/jQuery/angular files, support AMD loading

原始格式数据的输出
==============

print sys_refcursor
----------------------

* 要将一个 SQL query 的结果输出，只要调用 rs.print(name, sys_refcursor) 或 rs.print(sys_refcursor)。
* 对于第二种没有 name 参数的调用，系统根据请求特征分别自动命名为 $OBJECTS, $OBJECT, $DATA。
* 首先只要使用了 rs.print 都会自动设定 Content-Type: text/resultsets，开发人员不用再手动指定了。
* **特别提示**：如果之前设置 Content-Type 为非缺省的 text/html，那么 rs.print 将不会自动设定 Content-Type: text/resultsets，而是**认可和保持**
* 服务端和客户端的 parser 处理器看到响应头Content-Type: text/resultsets，就会知道是原始结果集从而进行解析。

basic examples
---------------

print with default name

* $DATA if not in REST url request
* $OBJECTS if a REST url for object collection
* $OBJECT if a REST url for single object

source
```plsql
create or replace package body team_player_h is

     procedure query is
          cur sys_refcursor;
     begin
          open cur for
               select a.* from team_player_t a where a.tid = r.getn('i$team');
          rs.print(cur);
     end;
...
end team_player_h;
```

raw output
```text
[$OBJECTS]
TID:2,MID:2,NAME:1,NICK:1,NUM:2,TELE:1,BIRTH:12,POS:1,X:2,Y:2
0,7,陈添翼,添翼,7,,,,313,479
0,8,张祝,大树,8,,,,885,307

```

javascript object converted (for rest request, require objects)
```json
[
  {
    "tid": 0,
    "mid": 7,
    "name": "陈添翼",
    "nick": "添翼",
    "num": 7,
    "tele": "",
    "birth": "",
    "pos": "",
    "x": 313,
    "y": 479
  },
  {
    "tid": 0,
    "mid": 8,
    "name": "张祝",
    "nick": "大树",
    "num": 8,
    "tele": "",
    "birth": "",
    "pos": "",
    "x": 885,
    "y": 307
  }
]
```

resultsets 支持的数据结构的概览
-----------------------------
* meta/data
* 安全分隔符
* 安全注释
* 多个 result set 共存
* 多个 result set 形成层次数据
* 进一步形成不限层级数据 (todo)
* 支持指定哪个字段为 key，输出 object 代替 array (todo)

meta data
-------------
NORADLE 数据输出服务不仅仅是输出数据本身，
也同时输出数据的 meta data，
该 meta data 来自于 dbms_sql 对 sys_refcursor 中 SQL query 的字段分析，
包括了各个字段的名称和类型。

safe resultsets format
--------------------------

### 安全的分隔符选择

输出 result sets 时，使用什么字符或字符代表行分割和列分割非常重要。
考虑到不能是字段名称、类型名称、数据记录字段值中出现的。
同时又要在文本编辑器、excel等表格编辑器中直接查看。
因此选择一个不可见字符加标准的换行符和加标准的逗号作为记录分割符(也是换行符)和字段分隔符。
这样响应结果既能分割安全，又不影响直接查看。具体如下：

* "\x1E\n" - 记录分隔符   代表原来的行分割
* "\x1F," - 单元分隔符   代表原来的逗号列分隔符

### servlet 输出多个结果集

可以多次调用 rs.print 带入多个不同的 sql query sys_refcursor 来输出多个结果集，
输出将采用两个连续换行来识别结果集之间的切换，
解析完的 javascript object 中靠名称区分各个结果集。

### 希望在结果集前添加注释

调用 rs.use_remarks，该API会自动设置打印换行符为 resultsets 的双字节安全换行符，
之后所有使用 print API，如 h.line('#anytext') 的输出都使用 resultsets 的换行符，
而内容开头为 # 的行会自动被 resultsets parser 忽略掉
从而不影响解析器的工作。

### 数据类型的直接转换

对于结果集各字段的输出值根据对应字段类型，
在 javascript 端还原为源类型。
目前看，主要就是数字类型的，
如果是整型，使用 parseInt，
如果是小数，使用 parseFloat。
对于字段类型为 number,binary_float,binary_double的数据项，
parse 时直接使用 parseFloat 转换成 javascript number 类型。

各个类型对应的类型代码如下，可查看 rss.name.attrs[n].dataType.
```
varchar2 1
number(int) 2
date 12
char 96
binary_float 100
binary_double 101
raw 23
```

scalar variables (sql)
----------------------

可以通过 open c for select p1 as n1, p2 as n2, .... from dual;
然后将其带入 rs.print(c) 来输出 scalar 数据，并为每项数据命名。

scalar variables (direct)
--------------------------

通过调用以下 API 来直接输出名值对，支持字符串、数字、日期、布尔4中类型。

* rs.nv(n varchar2, v varchar2);
* rs.nv(n varchar2, v number);
* rs.nv(n varchar2, v date);
* rs.nv(n varchar2, v boolean);

plsql source code
```plsql
	procedure scalars is
	begin
		h.convert_json;
		rs.nv('name', 'kaven276');
		rs.nv('age', 39);
		rs.nv('birth', sysdate - 39);
		rs.nv('married', true);
	end;
```

raw result
```text

*s|name=kaven276

*n|age=39

*d|birth=2015-08-13 15:16:23

*b|married=T
```

final result
```json
{
  "name": "kaven276",
  "age": 39,
  "birth": "2015-08-13 14:41:51",
  "married": true
}
```

scalar array, not object array
------------------------------

当一个字段名称为"-" 时，代表结果集就是该字段值的数组，其中项都是直接量，不是对象。

By default, `rs.print` will produce array of objects,
but if the SQL query have a column aliased as "-",
noradle will treat the result as a array of single column values for that "-" aliased column.
And it's true for child result set too.

example:

source 
```plsql
	procedure scalar_array is
		cur sys_refcursor;
	begin
		open cur for
			select a.object_name "-" from user_objects a where a.object_type = 'PACKAGE' order by 1 asc;
		rs.print('packages', cur);
	end;
```

final result
```json
{
  "packages": {
    "name": "packages",
    "attrs": [
      {
        "name": "-",
        "dataType": 1
      }
    ],
    "rows": [
      "ATTR_TAGP_DEMO_B",
      "AUTH_B",
      "AUTH_S",
      ...
    ]
  }
}
```

key-value hash instead of array of object
------------------------------------------

rs.print 输出的结果集默认输出记录集到 rows array 中，
通过设定 key 字段，可以将结果生成到 hash 中，
其中 key-value 为 (key -> record object)。

- 这个非常关键，可以帮助形成有关系(非父子包含)数据间的关联
- 一些配置数据的输出就简化了，因为本来就是通过 key 访问的
- 从而可以将一个数据库中的局部数据集完整的提供给客户端
- 不同时输出 array/hash，因为数据冗余太大，
- 通过 rs.print('name^-key, sys_refcur)

API:

通过 rs.print('name^-key, sys_refcur)

* 当结果集名称包含^时，不再生成 rows array，改为生成 hash object
* rs.print('name^key', sys_refcursor) 会以key字段作为hash key
* rs.print('name^', sys_refcursor) 会以第一个字段作为hash key
* rs.print('name^-', sys_refcursor) ^ 后跟着“-”，value object 自动去除 key 字段

example:

plsql source
```plsql
	procedure pack_kv is
		cur sys_refcursor;
	begin
		open cur for
			select a.object_name pack, a.created, a.status
				from user_objects a
			 where a.object_type = 'PACKAGE'
			 order by 1 asc;
		rs.print('packages^-', cur);
	end;
```

json result
```json
{
  "packages": {
    "name": "packages",
    "attrs": [
      {
        "name": "pack",
        "dataType": 1
      },
      {
        "name": "created",
        "dataType": 12
      },
      {
        "name": "status",
        "dataType": 1
      }
    ],
    "key": "pack",
    "stripKey": true,
    "hash": {
      "ATTR_TAGP_DEMO_B": {
        "created": "2015-04-20 16:39:54",
        "status": "VALID"
      },
      ...
      "XML_PAGE_B": {
        "created": "2015-04-20 16:39:54",
        "status": "VALID"
      }
    }
  }
}
```

hierachical data print
----------------------

API:

`rs.print('child/fkColName|parent/pkColName', cur);`

* parent result set before child result set
* result sets must be ordered by join key in parent and child in same direction
* 识别父子关系结果集，要求都要按关联字段排序，且方向一致
* 对于父子表，需要手工指定子表名称和配置
* 通过在名称中在符号“|”后指定当前结果集属于哪个结果集的子数据，
* 子表名称作为父结果集记录对象的一个属性名称
* 特别的在 fkColName 中指定子表中关联字段的名称，
* 在 pkColName 中指定父表中关联字段的名称，
* fkColName 不指定默认为是 pkColName，没有默认是子数据集第一个字段
* pkColName 不指定默认是 fkColName，莫有默认是父数据集第一个字段
* fkColName 以“-”开头的，子记录中将不包含该字段，因为和父数据集的pkColName属性重复

parent/child example:

```plsql
procedure pack_proc is
  cur sys_refcursor;
begin
  open cur for
    select a.object_name pack, a.created, a.status
      from user_objects a
     where a.object_type = 'PACKAGE'
     order by 1 asc;
  rs.print('packages', cur);

  open cur for
    select a.object_name pack, a.procedure_name "_"
      from user_procedures a
     where a.object_type = 'PACKAGE'
       and a.procedure_name is not null
     order by a.object_name asc, a.subprogram_id asc;
  --rs.print('procedures', cur);
  rs.print('procedures/pack|packages/pack', cur);
end;
```

final result
```json
{
  "packages": {
    "name": "packages",
    "attrs": [
      {
        "name": "pack",
        "dataType": 1
      },
      {
        "name": "created",
        "dataType": 12
      },
      {
        "name": "status",
        "dataType": 1
      }
    ],
    "rows": [
      {
        "pack": "BASIC_IO_B",
        "created": "2015-04-20 16:39:54",
        "status": "VALID",
        "procedures": [
          "REQ_INFO",
          "OUTPUT",
          "PARAMETERS",
          "KEEP_URLENCODED",
          "ANY_SIZE"
        ]
      },
    ...
    ]
  },
  "procedures": {
    "name": "procedures",
    "attrs": [
      {
        "name": "pack",
        "dataType": 1
      },
      {
        "name": "_",
        "dataType": 1
      }
    ],
    "parent": "packages",
    "pk": "pack",
    "fk": "pack"
  }
}
```

key-value in child
-------------------

example:

plsql source
```plsql
	procedure pack_kv_child is
		cur sys_refcursor;
	begin
		open cur for
			select a.object_name pack, a.created, a.status
				from user_objects a
			 where a.object_type = 'PACKAGE'
			 order by 1 asc;
		rs.print('packages^-', cur);
	
		open cur for
			select a.object_name pack, a.procedure_name proc, a.subprogram_id
				from user_procedures a
			 where a.object_type = 'PACKAGE'
				 and a.procedure_name is not null
			 order by a.object_name asc, a.subprogram_id asc;
		rs.print('procedures^-proc/-pack|packages/pack', cur);
	end;
```

json result
```json
{
  "packages": {
    "name": "packages",
    "attrs": [
      {
        "name": "pack",
        "dataType": 1
      },
      {
        "name": "created",
        "dataType": 12
      },
      {
        "name": "status",
        "dataType": 1
      }
    ],
    "key": "pack",
    "stripKey": true,
    "hash": {
      "AUTH_B": {
        "created": "2015-04-20 16:39:54",
        "status": "VALID",
        "procedures": {
          "BASIC": {"subprogram_id": 1},
          "DIGEST": {"subprogram_id": 2},
          "COOKIE_GAC": {"subprogram_id": 3},
          "LOGIN": {"subprogram_id": 4},
          "LOGOUT": {"subprogram_id": 5},
          "PROTECTED_PAGE": {"subprogram_id": 6},
          "BASIC_AND_COOKIE": {"subprogram_id": 7},
          "LOGOUT_BASIC": {"subprogram_id": 8},
          "CHECK_UPDATE": {"subprogram_id": 9}
        }
      },
      ...
      "XML_PAGE_B": {
        "created": "2015-04-20 16:39:54",
        "status": "VALID",
        "procedures": {
          "XMLGEN_STR": {"subprogram_id": 1},
          "XMLGEN_CUR": {"subprogram_id": 2},
          "XMLGEN_HIER": {"subprogram_id": 3},
          "SQL_USERS": {"subprogram_id": 4},
          "XML_USERS_CSS": {"subprogram_id": 5},
          "XML_USERS_XSL_CLI": {"subprogram_id": 6},
          "XML_USERS_XSL_SVR": {"subprogram_id": 7}
        }
      }
    }
  },
  "procedures": {
    "name": "procedures",
    "attrs": [
      {
        "name": "pack",
        "dataType": 1
      },
      {
        "name": "proc",
        "dataType": 1
      },
      {
        "name": "subprogram_id",
        "dataType": 2
      }
    ],
    "key": "proc",
    "stripKey": true,
    "parent": "packages",
    "pk": "pack",
    "fk": "pack"
  }
}
```

complex example
-----------------

* use rs.print(name, sys_refcursor) to name each SQL query result set
* print multiple SQL query result sets with each name
* print scalar variable/value by "select from dual" as sys_refcursor
* call rs.use_remarks and print line start with "#" as comment, that will be bypassed for parse
* call any cache API like "h.etag_md5_on" to enable response cache to improve performance

```javascript
create or replace package body db_src_b is

     procedure example is
          cur sys_refcursor;
          v1  varchar2(50) := 'psp.web';
          v2  number := 123456;
          v3  date := date '1976-10-26';
     begin
          h.etag_md5_on;
          rs.use_remarks;
          h.line('# a stardard psp.web result sets example page');
          h.line('# It can be used in browser or NodeJS');
          h.line('# You can use some standard parser or write your own ' ||
                          'parsers to convert the raw resultsets to javascript data object');
          h.line('# see PL/SQL source at ' || r.dir_full || '/src_b.proc/' || r.prog);
   
          open cur for
               select a.object_name, a.subobject_name, a.object_type, a.created
                    from user_objects a
                where rownum <= r.getn('limit', 8);
          rs.print('objects', cur);
   
          open cur for
               select v1 as name, v2 as val, v3 as ctime, r.getc('param1') p1, r.getc('param2') p2, r.getc('__parse') pnull
                    from dual;
          rs.print('namevals', cur);
     end;

end db_src_b;
```

raw output
```text
# a stardard psp.web result sets example page
# It can be used in browser or NodeJS
# You can use some standard parser or write your own parsers to convert the raw resultsets to javascript data object
# see PL/SQL source at http://localhost:8889/demo1//src_b.proc/db_src_b.example

[objects]
OBJECT_NAME:1,SUBOBJECT_NAME:1,OBJECT_TYPE:1,CREATED:12
TOOL,,TYPE,2015-04-20 16:38:39
USER_T,,TABLE,2015-04-20 16:38:45
PK_USER,,INDEX,2015-04-20 16:39:46

[namevals]
NAME:1,VAL:2,CTIME:12,P1:1,P2:1,PNULL:1
psp.web,123456,1976-10-26 00:00:00,,,
```

converted javascript object graph:
```
{ objects:
   { name: 'objects',
     attrs:
      [ { name: 'object_name', dataType: 1 },
        { name: 'subobject_name', dataType: 1 },
        { name: 'object_type', dataType: 1 },
        { name: 'created', dataType: 12 } ],
     rows:
      [ { object_name: 'TOOL',
          subobject_name: '',
          object_type: 'TYPE',
          created: '2015-04-20 16:38:39' },
        { object_name: 'USER_T',
          subobject_name: '',
          object_type: 'TABLE',
          created: '2015-04-20 16:38:45' },
        { object_name: 'PK_USER',
          subobject_name: '',
          object_type: 'INDEX',
          created: '2015-04-20 16:39:46' } ] },
  namevals:
   { name: 'namevals',
     attrs:
      [ { name: 'name', dataType: 1 },
        { name: 'val', dataType: 2 },
        { name: 'ctime', dataType: 12 },
        { name: 'p1', dataType: 1 },
        { name: 'p2', dataType: 1 },
        { name: 'pnull', dataType: 1 } ],
     rows:
      [ { name: 'psp.web',
          val: 123456,
          ctime: '1976-10-26 00:00:00',
          p1: '',
          p2: '',
          pnull: '' } ] } }
```

客户端进行原始格式解析的支持
==========================

意义
------

 由客户端解析原始格式数据，网络传输量明显减少，并将服务端集中转换的压力分散开，特别是针对node单CPU处理线程机制尤为重要。

为了减轻node服务进程的CPU处理工作量，
尽量使得 node 服务只做最基本的协议转接通道，
专门用于请求响应的转发，尽量少干预应用的 workload。


希望能够提供客户端的 RAW 转换器，并提供 jQuery/Angular 中的自动拦截器。


noradle 如何判断客户端支持 raw format 解析
-----------------------------------------------------------------

符合以下条件可以判断客户端具有RAW响应解析能力，它只要原始格式数据

1. 客户端请求头accept包含text/resultsets类型
2. 查询串中包含useraw则被认定客户端只要raw格式自行处理(这个主要用于angularjs 的 JSONP 调用)

这样设计的理由：

1. 传统的 consumer 都希望 JSON 数据
2. 除非客户端指定要 text/resultsets。

如果客户端有自行转换能力，则显示请求 text/resultsets 或增加 useraw 到 query string，
否则一律自动转换成 JSON/JSONP/futher(xml,yaml,template) 等等。


在 AngularJS 中，无法对 JSONP 请求添加 request header，
对于有 callback 的请求，认定为按JSONP响应，
如果 query string 中包含 useraw 参数，则以 RAW 格式响应。

对于希望以 raw format 响应的 JSONP 内容，
其中不可见的换行符转换为 "\n" 字符串来符合 javascript 代码对含有换行的字符串的源文件格式要求，以解决正常的 javascrip 源码无法支持字符串换行的问题。

noradle http 服务直接提供客户端支持文件
-------------------------------------------------------

noradle http 处理器自动提供用于浏览器端和客户端的3个js库文件，包括：

1. 用于原始数据解析的 rsParse.js
2. 用于最流行js库jQuery的拦截器和默认设置，用于调用 jQuery ajax API 时自动设置支持自解析标志，和用于对接受的原始响应自动进行拦截转换
3. 用于最流行的js框架Angular的$http服务的拦截器设置，用于调用 $http,$resource服务时自动设置支持字解析标准，和用于对接收的原始响应自动进行拦截转换

* 三个文件的 url 均为 "/_/js/xxx.js"
* 三个文件均可以直接按顺序引用，同时也都支持 AMD/requirejs 环境
* 建议生产环境下将这三个文件一起和应用代码打包提供
* HTML5 webapp 页面引用后，可以自行使用 rsParse(raw) 解析
* 使用了 jq-resultsets-converter 模块后，jQuery 的JSON/JSONP请求都自动设定在客户端而不再服务端做转换
* 使用了 ng-resultsets-converter 模块后，AngularJS 的 JSON/JSONP请求都自动设定在客户端而不再服务端做转换

集成 REST 服务
=============

形成 [REST 服务](./rest.html)的支持，包括：

* 对 REST url 的解析支持
* 对 REST 服务的响应格式支持


设计将 REST 服务映射到存储过程，并很好地支持 convention over configuration；
同时将解析后的完整结果对象提取其中的对象集或单个对象数据部分给消费者。
此举在于可以更好的利用各种客户端框架特别是浏览器端JS库中对消费 REST 服务的良好支持，使得开发工作更轻松简单。


URL 解析机制
------------------

REST URL patten 参考：http://rest.elkstein.org/2008/02/what-is-rest.html。

举例：

* GET/team/:tid/member/:mid
* POST /team/:tid/member, will create a new member
* PUT /team/:tid/member/:mid will create new one with :mid or replace it


###规则

如 AngularJS 等服务都提供了非常方便的消费 REST 服务的方法，
如何将 REST url 映射到 noradle servlet 需要特别的设计。
Noradle 服务端的 RaqBase 模块对 url 的分析要做出改变，具体规则如下：


当 noradle 发现 pathname dir 后面第一部分，本来应该为 plsql unit(package,procedure) name
不是以 "_x"(下划线+单个字符)结束，就认为个名称不是直接映射到 plsql unit name 上，
而是一个 REST url，将按照 "/object_type/:object_id/subobject_type/:subobject_id 的格式认定，
并且将其映射到名称为 "otype_subotype_h" 的 package 上，并执行其中 action 过程,
最终也就是 otype_subotype_h.action，该过程再根据 method 等其他线索判断具体做什么那类处理。


举例：

1. URL 如 otype/:oid/subotype/:suboid 格式的都被认为是 REST url
2. 将映射到存储过程 otype_subotype_h.action 执行，同时填充 i$otype=:oid, i$subotype=:suboid 参数
3. 第一段落 otype 格式若为标准 servlet 格式 xxx_x，则认定为直接映射存储过程而不是rest url，按照传统的直接映射处理
4. 最后一段格式为 xxx.xxx 的认定为要访问普通文件，忽略
5. 支持将长 prog 映射成短 prog，映射完超过30 字节的package name会查看配置的mapping表转换成短名称 (oracle包名长度不能超过30字节)


REST 希望对象数组或单个对象
-----------------------------------------

Noradle 直接支持 angular $resource 服务对响应的要求，完成无缝集成。
来自 rest 服务(看请求参数，)的请求，无论在服务端还是客户端转换，
都要提取数据部分，忽略源数据等其他部分，
最终得到对象数组或者是单个对象。

1. 对于调用 rs.print(sys_refcursor) 这种不指定结果集名称的调用，自动设置名称
2. 如果判断是 REST 格式 url，则根据其URL特征，分别设置名称为 $OBJECTS/$OBJECT，否则是$DATA
3. 服务端和客户端的原始格式解析器得到完整结构后看到 $OBJECTS 键值则自动提取对象数组部分
4. 服务端和客户端的原始格式解析器得到完整结构后看到看到 $OBJECT 键值则自动提取其中第一也是唯一的一个目标对象


### 机制详细解释

angular $resource 希望得到 resultsets 的主数据的 rows 作为响应，
如何识别是否是 $resource 服务的请求呢，
noradle 后台做 url 解析的时候，判断出事 REST 服务后，
进一步判断URL是针对collection(偶数段落)还是single object(奇数段落)，
然后分别将结果集自动命名为 $OBJECTS 和 $OBJECT，
而不是REST url 的请求自动命名为 $DATA。
这样无论是服务器端解析还是浏览器端解析，
只要看解析完的数据的结果集名称是 $OBJECTS/$OBJECT/$DATA/自定义的，
就可以自动提取出最终需要的部分，如 object array 或者 single object，
从而满足如 angular.js $resource 服务的要求。

### for regularjs $resource(url_pattern)

 for example, you can call Collection.verb that map to http method to a interpolated url.

```text
/s/soccer/team/:tid/player/:mid

query -> team_player_h.query?tid=?
get -> team_player_h.get?tid=?&mid=?
post -> team_player_h.create?tid=?
post -> team_player_h.update?tid=?&mid=?
```



JSONP 支持
===============

如果要将 noradle data service 提供给非自己DNS的网站页面使用，就需要通过 JSONP 方式来调用，从而将数据服务范围扩大至全网。

以下情况被认定为通过JSONP访问

1. 请求URL中带参数callback，path?callback=xxx
2. servlet指定，调用 h.convert_json(callback)


JSONP 请求支持 REST
------------------------------

JSONP 请求同样支持 REST 服务，只是返回的 mime-type 为 application/javascript，内容被 callback(" ... ") 包围而已。


JSONP 请求支持 RAW 响应
-----------------------------------

响应格式形如 callback("raw data")，但是因为 javascript 的字符串 literal 中不能包含换行，因此对所有的 "\x1E\n" 中的 "\n" 替换成两个字节的 "\" + "n"。




templating integration
=====================================

响应数据支持带入模板后再返回客户端。

Noradle servlet 生成的 resultsets 可以被解析成 javascript 对象，
这些 javascript 对象数据可以被带入到各种 [consolidate](https://github.com/tj/consolidate.js/) 支持的模板中，
从而转换成如 htm/xml 的数据。

API
----------

`h.convert_json_template(template,engine=>null)`

将指示 Noradle http 处理器将响应转换到的javascript数据按照 engine 指定的类型，带入到 template 指定的模板文件中，然后进行 render。

### engine 如何确定

如果没有指定 engine，noradle 则检查 cfg.template_map 对照表做从文件名后缀到 engine 名称的转换，如果没有认为后缀就是 engine 名称。

目前默然的转换表包含 (mst, mustache) (hbr, handlebars) 两个转换。

如果文件名没有后缀，则按照 cfg.template_engine 配置指定。

### template 文件位置如何确定

cfg.template_dir 指定了模板文件保存的基础目录，template 参数指定文件相对于 cfg.template_dir 所在的文件路径。

范例
---------

```plsql
     procedure example is
          cur sys_refcursor;
     begin
          if not r.is_null('template') then
               h.convert_json_template(r.getc('template'), r.getc('engine'));
          end if;
          open cur for
               select a.object_name, a.subobject_name, a.object_type, a.created
                    from user_objects a
                where rownum <= r.getn('limit', 8);
          rs.print('objects', cur);
     end;
```

test.jade
```text
doctype html
html
  body
    table(rules="all")
      caption
        a(href="http://jade-lang.com/",target="jade";) learn jade
        | |
        a(href="./template/test.jade") template source
      tbody
        each o in objects.rows
          tr
            td= o.object_name
            td= o.subobject_name
            td= o.object_type
            td= o.created
```

test.hlb
```
<html>
<body>
<table rules="all">
  <caption>
    <a href="http://handlebarsjs.com/"; target="handlebars">learn handlebars</a>
    |
    <a href="./template/test.hbs">template source</a>
  </caption>
  <tbody>
  {{#objects.rows}}
    <tr>
      <td>{{object_name}}</td>
      <td>{{subobject_name}}</td>
      <td>{{object_type}}</td>
      <td>{{created}}</td>
    </tr>
  {{/objects.rows}}
  </tbody>
</table>
</body>
</html>
```

查看 noradle-demo 中的 db_src_b.example，其中demo索引页包含了 ejs, swig, jade, mustache, handlebars 5 个范例。

和 cache 机制的冲突处理策略(todo)
--------------------------------------------------

 h.auto_etag_on 和 gwCache 要考虑到 template 文件的变化，不能简单的 304 返回。(todo)
   需要看有无 _template 响应头，如果有还要看 _template 响应头是否变化
   可以是 etag 中增加 hash(template_name+file_lmt)，
   但是生产系统不可能总去查看文件有无改变，因此就认定不改变，
   更新 public/private cache 需要通过 no-cache request 来刷新


Todo & Plan
============

* 参考 knockout 数据获取比对方法
* 参考 mongoose / MEAN 中的数据变化方法
* 支持两级以上到不限制层级数的关系
* 输出 YAML，为了支持互相引用的数据
* 支持 XML/SOAP 转换
* 将已有的webservice转换成restful JSON service [webservice-to-rest][]


  [webservice-to-rest]: http://www.appcelerator.com/blog/2013/11/node-acs-soap-web-service-integration