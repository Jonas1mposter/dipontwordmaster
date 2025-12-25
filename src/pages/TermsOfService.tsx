import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-8 safe-area-inset">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        <h1 className="text-2xl font-bold mb-6">用户协议</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">最后更新日期：2024年12月25日</p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. 服务说明</h2>
            <p>
              狄邦单词通（以下简称"本应用"）是一款英语单词学习应用，提供单词学习、
              测试、对战等功能。使用本应用即表示您同意遵守本用户协议的所有条款。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. 用户注册</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>您必须提供准确、完整的注册信息</li>
              <li>您有责任维护账户的安全性和保密性</li>
              <li>您对使用您账户进行的所有活动负责</li>
              <li>如发现任何未经授权使用您账户的情况，请立即通知我们</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. 用户行为规范</h2>
            <p>使用本应用时，您同意：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>不发布或传播任何违法、有害、威胁、辱骂、骚扰、诽谤的内容</li>
              <li>不侵犯他人的知识产权或其他权利</li>
              <li>不使用任何自动化工具或脚本访问服务</li>
              <li>不干扰或破坏服务的正常运行</li>
              <li>遵守所有适用的法律法规</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. 知识产权</h2>
            <p>
              本应用的所有内容，包括但不限于文字、图形、标识、按钮图标、图像、音频片段、
              数据编辑以及软件，均为我们或我们的内容提供者的财产，受著作权法保护。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. 免责声明</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>服务按"现状"和"可用"基础提供，不作任何明示或暗示的保证</li>
              <li>我们不保证服务不会中断或没有错误</li>
              <li>对于因使用或无法使用服务而导致的任何直接、间接、附带、特殊或后果性损害，
                  我们不承担责任</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. 账户终止</h2>
            <p>
              我们保留在以下情况下暂停或终止您账户的权利：
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>违反本用户协议</li>
              <li>从事欺诈或非法活动</li>
              <li>长时间不活跃</li>
            </ul>
            <p>
              您也可以随时通过应用内的账户设置请求删除您的账户。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. 协议修改</h2>
            <p>
              我们保留随时修改本用户协议的权利。修改后的协议将在应用内发布时生效。
              继续使用服务即表示您接受修改后的协议。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. 适用法律</h2>
            <p>
              本协议受中华人民共和国法律管辖。任何因本协议引起的争议，
              应提交至有管辖权的人民法院解决。
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. 联系方式</h2>
            <p>
              如果您对本用户协议有任何疑问，请联系我们：
            </p>
            <p className="font-medium text-foreground">
              邮箱：support@dipontwordmaster.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
